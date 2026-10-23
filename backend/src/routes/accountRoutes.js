
'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const db = require('../config/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();

// ========================================
// ADMIN AUTHORIZATION
// ========================================

// Chỉ tài khoản Admin được sử dụng API này.
// Kiểm tra thêm tại router để bảo vệ độc lập.
router.use(allowRoles('admin'));

const VALID_ROLES = ['admin', 'teacher', 'student'];

// ========================================
// HELPERS
// ========================================

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message
  });
}

function handleDatabaseError(res, error) {
  console.error('Account Management Error:', error);

  if (error.code === 'ER_DUP_ENTRY') {
    return sendError(
      res,
      409,
      'Tên đăng nhập hoặc hồ sơ này đã được cấp tài khoản.'
    );
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return sendError(
      res,
      400,
      'Không tìm thấy hồ sơ sinh viên hoặc giáo viên.'
    );
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return sendError(
      res,
      409,
      'Tài khoản đang được dữ liệu khác tham chiếu.'
    );
  }

  return sendError(
    res,
    500,
    'Lỗi hệ thống khi xử lý tài khoản.'
  );
}

function generatePassword() {
  // Mật khẩu ngẫu nhiên an toàn, dài 20 ký tự.
  return crypto.randomBytes(15).toString('base64url');
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    Buffer.byteLength(password, 'utf8') <= 72
  );
}

function parseId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function parseAccount(body) {
  const username = String(body.username ?? '').trim();
  const role = String(body.role ?? '');

  const studentId =
    body.student_id == null || body.student_id === ''
      ? null
      : parseId(body.student_id);

  const teacherId =
    body.teacher_id == null || body.teacher_id === ''
      ? null
      : parseId(body.teacher_id);

  if (
    username.length < 1 ||
    username.length > 50 ||
    !/^[A-Za-z0-9._-]+$/.test(username)
  ) {
    throw new Error(
      'Tên đăng nhập phải dài 1-50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'
    );
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error('Vai trò tài khoản không hợp lệ.');
  }

  if (role === 'student' && !studentId) {
    throw new Error(
      'Vui lòng chọn hồ sơ sinh viên.'
    );
  }

  if (role === 'teacher' && !teacherId) {
    throw new Error(
      'Vui lòng chọn hồ sơ giáo viên.'
    );
  }

  return {
    username,
    role,
    student_id: role === 'student' ? studentId : null,
    teacher_id: role === 'teacher' ? teacherId : null
  };
}

async function getAccount(id) {
  const [rows] = await db.query(
    `SELECT id, username, role, student_id,
            teacher_id, is_active
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

// ========================================
// GET /api/accounts
// DANH SÁCH TÀI KHOẢN
// ========================================

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.id,
        u.username,
        u.role,
        u.student_id,
        u.teacher_id,
        u.is_active,
        u.created_at,
        s.full_name AS student_name,
        t.full_name AS teacher_name
      FROM users u
      LEFT JOIN students s
        ON s.id = u.student_id
      LEFT JOIN teachers t
        ON t.id = u.teacher_id
      ORDER BY u.id DESC
    `);

    return res.json({
      success: true,
      total: rows.length,
      data: rows
    });

  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// ========================================
// GET /api/accounts/teachers
// DANH SÁCH GIÁO VIÊN
// ========================================

router.get('/teachers', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        teacher_code,
        full_name
      FROM teachers
      ORDER BY teacher_code
    `);

    return res.json({
      success: true,
      total: rows.length,
      data: rows
    });

  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// ========================================
// POST /api/accounts
// TẠO VÀ CẤP TÀI KHOẢN
// ========================================

router.post('/', async (req, res) => {
  try {
    const account = parseAccount(req.body || {});

    let password = req.body?.password;

    if (password == null || password === '') {
      password = generatePassword();
    }

    if (!validatePassword(password)) {
      return sendError(
        res,
        400,
        'Mật khẩu phải có ít nhất 8 ký tự và không quá 72 byte.'
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.query(`
      INSERT INTO users (
        username,
        password_hash,
        role,
        student_id,
        teacher_id,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, 1)
    `, [
      account.username,
      passwordHash,
      account.role,
      account.student_id,
      account.teacher_id
    ]);

    return res.status(201).json({
      success: true,
      message: 'Cấp tài khoản thành công.',
      data: {
        id: result.insertId,
        username: account.username,
        role: account.role
      },
      temporary_password: password
    });

  } catch (error) {
    if (!error.code && error instanceof Error) {
      return sendError(res, 400, error.message);
    }

    return handleDatabaseError(res, error);
  }
});

// ========================================
// PUT /api/accounts/:id
// CẬP NHẬT TÀI KHOẢN
// ========================================

router.put('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return sendError(res, 400, 'ID tài khoản không hợp lệ.');
    }

    const existing = await getAccount(id);

    if (!existing) {
      return sendError(res, 404, 'Không tìm thấy tài khoản.');
    }

    const account = parseAccount(req.body || {});

    // Không cho Admin tự hạ quyền chính mình.
    if (
      id === Number(req.session.user.id) &&
      account.role !== 'admin'
    ) {
      return sendError(
        res,
        403,
        'Không thể tự thay đổi vai trò Admin đang đăng nhập.'
      );
    }

    await db.query(`
      UPDATE users
      SET
        username = ?,
        role = ?,
        student_id = ?,
        teacher_id = ?
      WHERE id = ?
    `, [
      account.username,
      account.role,
      account.student_id,
      account.teacher_id,
      id
    ]);

    return res.json({
      success: true,
      message: 'Cập nhật tài khoản thành công.'
    });

  } catch (error) {
    if (!error.code && error instanceof Error) {
      return sendError(res, 400, error.message);
    }

    return handleDatabaseError(res, error);
  }
});

// ========================================
// POST /api/accounts/:id/reset-password
// ĐẶT LẠI MẬT KHẨU
// ========================================

router.post('/:id/reset-password', async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return sendError(res, 400, 'ID tài khoản không hợp lệ.');
    }

    const existing = await getAccount(id);

    if (!existing) {
      return sendError(res, 404, 'Không tìm thấy tài khoản.');
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await db.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, id]
    );

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công.',
      temporary_password: password
    });

  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// ========================================
// PATCH /api/accounts/:id/status
// KHÓA / MỞ KHÓA TÀI KHOẢN
// ========================================

router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return sendError(res, 400, 'ID tài khoản không hợp lệ.');
    }

    const rawStatus = req.body?.is_active;

    if (![0, 1, true, false].includes(rawStatus)) {
      return sendError(
        res,
        400,
        'Trạng thái tài khoản không hợp lệ.'
      );
    }

    const isActive = Number(rawStatus);

    const existing = await getAccount(id);

    if (!existing) {
      return sendError(res, 404, 'Không tìm thấy tài khoản.');
    }

    if (
      id === Number(req.session.user.id) &&
      isActive === 0
    ) {
      return sendError(
        res,
        403,
        'Không thể tự khóa tài khoản đang đăng nhập.'
      );
    }

    await db.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive, id]
    );

    return res.json({
      success: true,
      message: isActive
        ? 'Đã mở khóa tài khoản.'
        : 'Đã khóa tài khoản.'
    });

  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// ========================================
// DELETE /api/accounts/:id
// XÓA TÀI KHOẢN
// ========================================

router.delete('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return sendError(res, 400, 'ID tài khoản không hợp lệ.');
    }

    const existing = await getAccount(id);

    if (!existing) {
      return sendError(res, 404, 'Không tìm thấy tài khoản.');
    }

    // Không cho Admin xóa chính mình.
    if (id === Number(req.session.user.id)) {
      return sendError(
        res,
        403,
        'Không thể tự xóa tài khoản đang đăng nhập.'
      );
    }

    // Chỉ xóa users, không xóa hồ sơ hay bảng điểm.
    await db.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message:
        'Xóa tài khoản thành công. Hồ sơ và điểm số được giữ nguyên.'
    });

  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

module.exports = router;
