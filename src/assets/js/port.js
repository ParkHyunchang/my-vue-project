function port() {
  const portSection = document.querySelector('.port-section');
  const portWrap = document.querySelector('.port__wrap');
  if (!portSection || !portWrap) return;

  function updateHorizontalScroll() {
    const horizontalScrollLength = portWrap.scrollWidth - window.innerWidth;
    portSection.style.height = (horizontalScrollLength + window.innerHeight) + 'px';
  }
  updateHorizontalScroll();
  window.addEventListener('resize', updateHorizontalScroll);

  window.addEventListener('scroll', function() {
    const sectionTop = portSection.offsetTop;
    const sectionHeight = portSection.offsetHeight;
    const scrollY = window.scrollY;
    const horizontalScrollLength = portWrap.scrollWidth - window.innerWidth;
    if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight - window.innerHeight) {
      portWrap.parentElement.style.position = 'fixed';
      portWrap.parentElement.style.top = '0';
      portWrap.parentElement.style.left = '0';
      portWrap.parentElement.style.width = '100vw';
      portWrap.parentElement.style.height = '100vh';
      const scrollOffset = scrollY - sectionTop;
      portWrap.style.transform = `translateX(-${scrollOffset}px)`;
    } else if (scrollY < sectionTop) {
      portWrap.parentElement.style.position = 'sticky';
      portWrap.parentElement.style.top = '0';
      portWrap.parentElement.style.left = '0';
      portWrap.parentElement.style.width = '100vw';
      portWrap.parentElement.style.height = '100vh';
      portWrap.style.transform = 'translateX(0)';
    } else {
      portWrap.parentElement.style.position = 'absolute';
      portWrap.parentElement.style.top = (sectionHeight - window.innerHeight) + 'px';
      portWrap.parentElement.style.left = '0';
      portWrap.parentElement.style.width = '100vw';
      portWrap.parentElement.style.height = '100vh';
      portWrap.style.transform = `translateX(-${horizontalScrollLength}px)`;
    }
  });
}

export { port };