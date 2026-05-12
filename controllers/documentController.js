const path = require('path');
const Document = require('../models/Document');
const { Flashcard, Quiz, ChatHistory } = require('../models/index');
const { extractPDFContent, deleteFile } = require('../services/pdfService');

const COLORS = ['indigo', 'emerald', 'violet', 'amber', 'rose'];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];


// ─────────────────────────────────────────────
//  POST /api/documents/upload
// ─────────────────────────────────────────────
const uploadDocument = async (req, res, next) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    filePath = req.file.path;

    // Create document record (processing)
    const doc = await Document.create({
      user:             req.user._id,
      name:             req.body.name || req.file.originalname,
      originalName:     req.file.originalname,
      filePath:         req.file.path,
      fileSize:         req.file.size,
      mimeType:         req.file.mimetype,
      processingStatus: 'processing',
      colorTag:         randomColor(),
    });

    // Extract PDF content asynchronously
    let extraction;
    try {
      extraction = await extractPDFContent(filePath);
      await Document.findByIdAndUpdate(doc._id, {
        extractedText:    extraction.text,
        textLength:       extraction.textLength,
        pages:            extraction.pages,
        processingStatus: 'completed',
      });
    } catch (pdfErr) {
      await Document.findByIdAndUpdate(doc._id, {
        processingStatus: 'failed',
        processingError:  pdfErr.message,
      });
      // Don't delete — let user know processing failed
    }

    const updated = await Document.findById(doc._id);
    res.status(201).json({
      success:  true,
      message:  'Document uploaded successfully',
      document: formatDocument(updated),
    });
  } catch (err) {
    // Clean up uploaded file on unexpected error
    if (filePath) deleteFile(filePath);
    next(err);
  }
};


// ─────────────────────────────────────────────
//  GET /api/documents
// ─────────────────────────────────────────────
const getDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = { user: req.user._id };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select('-extractedText'), // Exclude heavy field from list
      Document.countDocuments(query),
    ]);

    res.json({
      success: true,
      documents: documents.map(formatDocument),
      pagination: {
        total,
        page:      parseInt(page),
        limit:     parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  GET /api/documents/:id
// ─────────────────────────────────────────────
const getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id:  req.params.id,
      user: req.user._id,
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    res.json({ success: true, document: formatDocument(doc) });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  GET /api/documents/:id/content  (internal AI use)
// ─────────────────────────────────────────────
const getDocumentContent = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id:  req.params.id,
      user: req.user._id,
    }).select('+extractedText');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    res.json({
      success: true,
      content: doc.extractedText || '',
      textLength: doc.textLength,
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  DELETE /api/documents/:id
// ─────────────────────────────────────────────
const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id:  req.params.id,
      user: req.user._id,
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Delete physical file
    deleteFile(doc.filePath);

    // Cascade delete: flashcards, quizzes, chat history
    await Promise.all([
      Document.findByIdAndDelete(doc._id),
      Flashcard.deleteMany({ document: doc._id }),
      Quiz.deleteMany({ document: doc._id }),
      ChatHistory.deleteOne({ document: doc._id }),
    ]);

    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
};


// ─── Format document for response ─────────────
function formatDocument(doc) {
  return {
    id:               doc._id,
    name:             doc.name,
    originalName:     doc.originalName,
    fileUrl:          doc.fileUrl,
    fileSize:         doc.fileSize,
    pages:            doc.pages,
    textLength:       doc.textLength,
    summary:          doc.summary,
    colorTag:         doc.colorTag,
    processingStatus: doc.processingStatus,
    processingError:  doc.processingError,
    createdAt:        doc.createdAt,
    updatedAt:        doc.updatedAt,
  };
}


module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  getDocumentContent,
  deleteDocument,
};
