export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('bunyan-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
