'use strict';

function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!req.session.isAdmin) {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
}

function requireMasterAdmin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!req.session.isMasterAdmin) {
        return res.status(403).json({ success: false, message: 'Master admin access required.' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin, requireMasterAdmin };
