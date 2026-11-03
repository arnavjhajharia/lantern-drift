// portal.js : one tiny adapter between our games and web-game portal SDKs.
// Games call Portal.start() / Portal.stop() / Portal.happy() / Portal.midgame(cb) / Portal.setAudio(ctx).
// With no SDK on the page (GitHub Pages, local), every call is a safe no-op and midgame(cb) just runs cb.
// Supported: CrazyGames SDK v3 (window.CrazyGames.SDK) and GamePix SDK v3 (window.GamePix). Others can be added the same way.
(function () {
  let sdk = null, gpx = null, ready = false, playing = false, audio = null, adBusy = false;
  const q = [];
  const events = [];
  const log = (...a) => { events.push(a.join(' ')); if (/[?&]portaldebug/.test(location.search)) console.log('[portal]', ...a); };

  async function init() {
    if (window.GamePix) { gpx = window.GamePix; ready = true; log('gamepix ready'); return flush(); }
    const CG = window.CrazyGames && window.CrazyGames.SDK;
    if (!CG) { ready = true; log('no sdk'); return flush(); }
    try {
      await CG.init();
      if (CG.environment === 'disabled') { log('cg disabled'); ready = true; return flush(); }
      sdk = CG; log('cg ready', CG.environment);
      try { sdk.game.loadingStop && sdk.game.loadingStop(); } catch (e) {}
    } catch (e) { log('cg init failed', e); }
    ready = true; flush();
  }
  function flush() { while (q.length) q.shift()(); }
  function whenReady(fn) { ready ? fn() : q.push(fn); }

  function mute(on) {
    if (!audio) return;
    try { on ? audio.suspend() : audio.resume(); } catch (e) {}
  }

  const Portal = {
    events,
    get name() { return sdk ? 'crazygames' : gpx ? 'gamepix' : 'none'; },
    setAudio(ctx) { audio = ctx; },
    start() { whenReady(() => { if (sdk && !playing) { try { sdk.game.gameplayStart(); } catch (e) {} } playing = true; log('start'); }); },
    stop() { whenReady(() => { if (sdk && playing) { try { sdk.game.gameplayStop(); } catch (e) {} } playing = false; log('stop'); }); },
    happy() { whenReady(() => { if (sdk) { try { sdk.game.happytime(); } catch (e) {} } if (gpx) { try { gpx.happyMoment(); } catch (e) {} } log('happy'); }); },
    // Show a between-rounds ad if the portal wants one, then continue. Always calls cb exactly once.
    midgame(cb) {
      let done = false; const go = () => { if (done) return; done = true; adBusy = false; mute(false); cb && cb(); };
      if ((!sdk && !gpx) || adBusy) return go();
      adBusy = true;
      const wasPlaying = playing; if (wasPlaying) Portal.stop();
      const safety = setTimeout(go, 45000); // never strand the player if the SDK never answers
      if (gpx) { // GamePix decides itself whether an ad is due; we just offer the break
        mute(true); log('ad start');
        try { Promise.resolve(gpx.interstitialAd()).then(() => { clearTimeout(safety); log('ad done'); go(); }, (err) => { clearTimeout(safety); log('ad error', err); go(); }); }
        catch (e) { clearTimeout(safety); go(); }
        return;
      }
      try {
        sdk.ad.requestAd('midgame', {
          adStarted: () => { mute(true); log('ad start'); },
          adFinished: () => { clearTimeout(safety); log('ad done'); go(); },
          adError: (err) => { clearTimeout(safety); log('ad error', err); go(); },
        });
      } catch (e) { clearTimeout(safety); go(); }
    },
    // Rewarded ad: only offer it when canReward is true. cb(true) if the player earned the reward, cb(false) otherwise. Always calls cb once.
    get canReward() { return !!sdk; },
    rewarded(cb) {
      let done = false, got = false; const fin = () => { if (done) return; done = true; clearTimeout(safety); adBusy = false; mute(false); cb && cb(got); };
      if (!sdk || adBusy) { setTimeout(() => cb && cb(false)); return; }
      const safety = setTimeout(fin, 60000);
      adBusy = true; const wasPlaying = playing; if (wasPlaying) Portal.stop();
      try {
        sdk.ad.requestAd('rewarded', {
          adStarted: () => { mute(true); log('rewarded start'); },
          adFinished: () => { got = true; log('rewarded done'); fin(); if (wasPlaying) Portal.start(); },
          adError: (err) => { log('rewarded error', err); fin(); if (wasPlaying) Portal.start(); },
        });
      } catch (e) { fin(); }
    },
  };
  window.Portal = Portal;
  init();
})();
