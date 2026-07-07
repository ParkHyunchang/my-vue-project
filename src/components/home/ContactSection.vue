<template>
  <section
    id="contact"
    class="contact-section"
  >
    <div class="contact__inner">
      <h2 class="contact__title">
        Contact
      </h2>
      <div class="section-divider" />
      <span class="section-sub">함께 일해요</span>
      <div class="contact__content">
        <div class="contact__message">
          <h3>함께 일하고 싶으시다면</h3>
          <p>새로운 프로젝트나 협업 기회에 대해 언제든 연락주세요. 빠른 시일 내에 답변드리겠습니다.</p>
        </div>
        <div class="contact__methods">
          <div class="contact__method">
            <span class="contact__icon">Email</span>
            <a href="mailto:hyunchang1234@hanmail.net">hyunchang1234@hanmail.net</a>
          </div>
          <div class="contact__method">
            <span class="contact__icon">Github</span>
            <a
              href="https://github.com/hyunchang"
              target="_blank"
            >github.com/hyunchang</a>
          </div>
        </div>
        <div class="contact__button">
          <a
            href="mailto:hyunchang1234@hanmail.net"
            class="btn btn-primary"
          >이메일 보내기</a>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ContactSection',
};
</script>
