
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET - Danh sách môn học
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM subjects ORDER BY id DESC'
    );

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('GET subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách môn học'
    });
  }
});

// GET - Chi tiết môn học
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM subjects WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('GET subject:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thông tin môn học'
    });
  }
});

// POST - Thêm môn học
router.post('/', async (req, res) => {
  try {
    const { subject_code, subject_name, credits } = req.body;

    if (
      typeof subject_code !== 'string' ||
      !subject_code.trim() ||
      typeof subject_name !== 'string' ||
      !subject_name.trim() ||
      !Number.isInteger(credits) ||
      credits < 1 ||
      credits > 10
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin môn học không hợp lệ'
      });
    }

    const [result] = await db.query(
      `INSERT INTO subjects
       (subject_code, subject_name, credits)
       VALUES (?, ?, ?)`,
      [subject_code.trim(), subject_name.trim(), credits]
    );

    res.status(201).json({
      success: true,
      message: 'Thêm môn học thành công',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('POST subject:', error);

    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY'
        ? 'Mã môn học đã tồn tại'
        : 'Không thể thêm môn học'
    });
  }
});

// PUT - Cập nhật môn học
router.put('/:id', async (req, res) => {
  try {
    const { subject_code, subject_name, credits } = req.body;

    if (
      typeof subject_code !== 'string' ||
      !subject_code.trim() ||
      typeof subject_name !== 'string' ||
      !subject_name.trim() ||
      !Number.isInteger(credits) ||
      credits < 1 ||
      credits > 10
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin môn học không hợp lệ'
      });
    }

    const [result] = await db.query(
      `UPDATE subjects
       SET subject_code = ?, subject_name = ?, credits = ?
       WHERE id = ?`,
      [subject_code.trim(), subject_name.trim(), credits, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật môn học thành công'
    });
  } catch (error) {
    console.error('PUT subject:', error);

    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY'
        ? 'Mã môn học đã tồn tại'
        : 'Không thể cập nhật môn học'
    });
  }
});

// DELETE - Xóa môn học
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM subjects WHERE id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    res.json({
      success: true,
      message: 'Xóa môn học thành công'
    });
  } catch (error) {
    console.error('DELETE subject:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa môn học'
    });
  }
});

module.exports = router;
