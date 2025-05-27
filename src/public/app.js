async function sumsubInit() {
    const res = await fetch('/sumsub/init');
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Init failed');
    }
    return res.json();
}
async function launchWebSdk() {
    const { token } = await sumsubInit();
    const sdk = window.snsWebSdk
        .init(token, 
    // refresh callback, returns Promise<string>
    () => sumsubInit().then(r => r.token))
        .withConf({
        lang: 'en',
        theme: 'light'
    })
        .withOptions({
        addViewportTag: false,
        adaptIframeHeight: true
    })
        .on('idCheck.onStepCompleted', (payload) => {
        console.log('Step completed:', payload);
    })
        .on('idCheck.onError', (error) => {
        console.error('SDK error:', error);
    })
        .build();
    sdk.launch('#sumsub-websdk-container');
}
launchWebSdk().catch(e => {
    console.error(e);
    const el = document.getElementById('sumsub-websdk-container');
    el.textContent = 'Error initializing Sumsub: ' + (e.error || e.message || e);
});
