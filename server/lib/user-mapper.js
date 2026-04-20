'use strict';

function masterEmail() {
    return (process.env.MASTER_ADMIN_EMAIL || 'info@northernveterinaryservice.co.uk').toLowerCase();
}

/**
 * Map DB user + address + services to client "profile" shape (matches legacy localStorage keys).
 */
function mapUserToClient(row, address, serviceCodes, profilePhotoBaseUrl) {
    if (!row) return null;
    const email = row.email;
    const isMaster =
        !!row.is_admin && (email || '').toLowerCase() === masterEmail();

    const profilePhotoUrl = row.profile_photo_path
        ? `${profilePhotoBaseUrl || ''}${row.profile_photo_path}`.replace(/([^:]\/)\/+/g, '$1')
        : null;

    return {
        id: String(row.id),
        practiceName: row.practice_name,
        email,
        phone: row.phone || '',
        address: address || {
            line1: '',
            line2: '',
            city: '',
            postcode: '',
            county: ''
        },
        role: row.role,
        accountType: row.account_type,
        rcvsRegistrationNumber: row.rcvs_registration_number || '',
        isAdmin: !!row.is_admin,
        isActive: row.is_active !== 0 && row.is_active !== false,
        isMasterAdmin: isMaster,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        servicesOffered: Array.isArray(serviceCodes) ? serviceCodes : [],
        profilePhotoUrl,
        profilePhotoDataUrl: null
    };
}

module.exports = { mapUserToClient, masterEmail };
