(function () {
    'use strict';

    function slugify(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function digitsOnly(value) {
        return String(value || '').replace(/\D/g, '');
    }

    function normalizePhone(value) {
        var source = String(value || '').trim();
        var digits = digitsOnly(source);

        if (digits.length < 8 || digits.length > 15) {
            throw new Error('Informe um telefone válido.');
        }

        return 'tel:' + (source.indexOf('+') !== -1 ? '+' : '') + digits;
    }

    function normalizeWhatsApp(value) {
        var digits = digitsOnly(value);

        if (digits.length < 10 || digits.length > 15) {
            throw new Error('Informe um WhatsApp válido, incluindo o DDD.');
        }

        return 'https://wa.me/' + digits;
    }

    function normalizeEmail(value) {
        var email = String(value || '').trim();
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            throw new Error('Informe um e-mail válido.');
        }

        return 'mailto:' + email;
    }

    function normalizeUrl(value) {
        var source = String(value || '').trim();
        var parsed;

        if (!source) {
            return '';
        }

        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
            source = 'https://' + source;
        }

        try {
            parsed = new URL(source);
        } catch (error) {
            throw new Error('Informe uma URL válida.');
        }

        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            throw new Error('A URL deve usar http ou https.');
        }

        if (!parsed.hostname || parsed.username || parsed.password) {
            throw new Error('Informe uma URL válida e sem dados de acesso.');
        }

        return parsed.href;
    }

    function hasExpectedDomain(url, domain) {
        var hostname = new URL(url).hostname.toLowerCase();
        return hostname === domain || hostname.endsWith('.' + domain);
    }

    function normalizeInstagram(value) {
        var source = String(value || '').trim();
        var username;
        var normalized;

        if (!source) {
            return '';
        }

        if (source.charAt(0) === '@') {
            username = source.slice(1).trim();
            if (!/^[a-zA-Z0-9._]+$/.test(username)) {
                throw new Error('Informe um usuário válido do Instagram.');
            }
            return 'https://instagram.com/' + username;
        }

        normalized = normalizeUrl(source);
        if (!hasExpectedDomain(normalized, 'instagram.com')) {
            throw new Error('Informe uma URL válida do Instagram.');
        }

        return normalized;
    }

    function normalizeLinkedIn(value) {
        var source = String(value || '').trim();
        var normalized;
        var pathname;

        if (!source) {
            return '';
        }

        normalized = normalizeUrl(source);
        pathname = new URL(normalized).pathname.toLowerCase();

        if (!hasExpectedDomain(normalized, 'linkedin.com') || !/^\/(in|company)\//.test(pathname)) {
            throw new Error('Informe uma URL do LinkedIn contendo /in/ ou /company/.');
        }

        return normalized;
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        window.setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    window.SignatureUtils = {
        slugify: slugify,
        escapeHtml: escapeHtml,
        normalizePhone: normalizePhone,
        normalizeWhatsApp: normalizeWhatsApp,
        normalizeEmail: normalizeEmail,
        normalizeUrl: normalizeUrl,
        normalizeInstagram: normalizeInstagram,
        normalizeLinkedIn: normalizeLinkedIn,
        downloadBlob: downloadBlob
    };
}());
