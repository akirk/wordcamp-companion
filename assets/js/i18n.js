(function (WCC) {
    const TEXT_DOMAIN = 'wordcamp-companion';
    const wpI18n = (window.wp && window.wp.i18n) ? window.wp.i18n : null;

    function localSprintf(format, args) {
        let positional = 0;
        return String(format).replace(/%(?:(\d+)\$)?([sd])/g, function (match, position) {
            const index = position ? parseInt(position, 10) - 1 : positional++;
            const value = args[index];
            return value === undefined ? match : String(value);
        });
    }

    function sprintf(format) {
        const args = Array.prototype.slice.call(arguments, 1);
        if (wpI18n && typeof wpI18n.sprintf === 'function') {
            return wpI18n.sprintf.apply(wpI18n, [format].concat(args));
        }
        return localSprintf(format, args);
    }

    function __(text) {
        if (wpI18n && typeof wpI18n.__ === 'function') {
            return wpI18n.__(text, TEXT_DOMAIN);
        }
        return text;
    }

    function _n(single, plural, number) {
        if (wpI18n && typeof wpI18n._n === 'function') {
            return wpI18n._n(single, plural, number, TEXT_DOMAIN);
        }
        return Number(number) === 1 ? single : plural;
    }

    Object.assign(WCC, {
        __: __,
        _n: _n,
        sprintf: sprintf,
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
