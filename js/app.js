;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  KCBAPP.initApp = async function () {
    try {
      if (KCBAPP.db) await KCBAPP.db.open();
      if (KCBAPP.router) {
        KCBAPP.router.renderSidebar();
        KCBAPP.router.renderTopbar();
        KCBAPP.router.navigate('home');
      } else {
        const content = root.document && root.document.getElementById('content');
        if (content) content.textContent = '加载中...';
      }
    } catch (e) {
      console.error('initApp error', e);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function () {
      KCBAPP.initApp();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KCBAPP;
  }
})(typeof window !== 'undefined' ? window : globalThis);
