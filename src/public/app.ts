interface SumsubInit {
  token: string;
  userId: string;
  externalUserId: string;
}

async function sumsubInit(): Promise<SumsubInit> {
  const res = await fetch('/sumsub/init');
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Init failed');
  }
  return res.json();
}

async function launchWebSdk(): Promise<void> {
  const { token } = await sumsubInit();

  const sdk = (window as any).snsWebSdk
    .init(
      token,
      // refresh callback, returns Promise<string>
      () => sumsubInit().then(r => r.token)
    )
    .withConf({
      lang: 'en',
      theme: 'light'
    })
    .withOptions({
      addViewportTag: false,
      adaptIframeHeight: true
    })
    .on('idCheck.onStepCompleted', (payload: any) => {
      console.log('Step completed:', payload);
    })
    .on('idCheck.onError', (error: any) => {
      console.error('SDK error:', error);
    })
    .build();

  sdk.launch('#sumsub-websdk-container');
}

launchWebSdk().catch(e => {
  console.error(e);
  const el = document.getElementById('sumsub-websdk-container')!;
  el.textContent = 'Error initializing Sumsub: ' + (e.error || e.message || e);
});
