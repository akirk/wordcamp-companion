(function (WCC) {
    const config = WCC.config || {};
    const loadingAssets = {};

    function loadLazyAsset(name) {
        if (!name) {
            return Promise.reject(new Error('Missing asset name.'));
        }

        if (loadingAssets[name]) {
            return loadingAssets[name];
        }

        const url = config.lazyAssets && config.lazyAssets[name] ? config.lazyAssets[name] : '';
        if (!url) {
            return Promise.reject(new Error('Lazy asset not configured: ' + name));
        }

        loadingAssets[name] = new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = function () {
                resolve();
            };
            script.onerror = function () {
                delete loadingAssets[name];
                reject(new Error('Could not load asset: ' + name));
            };
            document.head.append(script);
        });

        return loadingAssets[name];
    }

    Object.assign(WCC, {
        loadLazyAsset: loadLazyAsset
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
