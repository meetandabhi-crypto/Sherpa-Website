/* Sherpa Education · video testimonial cards (home page rail + testimonials page)
   - big play button over the poster; native controls once it's playing
   - only one video plays at a time */
(() => {
  const vids = [...document.querySelectorAll('.vid video')];
  vids.forEach(v => {
    const box = v.closest('.vid'), btn = box.querySelector('.vid__play');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); v.play().catch(() => {}); });
    v.addEventListener('play', () => {
      v.controls = true;   // native controls only once it's actually playing
      box.classList.add('is-playing');
      vids.forEach(o => { if (o !== v && !o.paused) o.pause(); });
    });
    v.addEventListener('ended', () => box.classList.remove('is-playing'));
  });
})();
