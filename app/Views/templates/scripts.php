<?php
/**
 * Scripts - JS ส่วนกลางของ app shell
 * - ยุบ/ขยาย sidebar (desktop = icon-rail, จอแคบ = drawer ทับ)
 * - เปิด/ปิดเมนูโปรไฟล์
 */
?>
<!-- ฉากหลังทึบตอนเปิด drawer (จอแคบ) -->
<div id="sidebar-backdrop" class="sidebar-backdrop" data-open="false"></div>

<script>
  (function () {
    var sidebar  = document.querySelector('.app-sidebar');
    var toggle   = document.getElementById('sidebar-toggle');
    var backdrop = document.getElementById('sidebar-backdrop');
    var isNarrow = function () { return window.matchMedia('(max-width:860px)').matches; };

    // ปุ่ม hamburger: จอแคบ -> เปิด drawer, จอกว้าง -> ยุบ/ขยาย
    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        if (isNarrow()) {
          var open = sidebar.getAttribute('data-open') !== 'true';
          sidebar.setAttribute('data-open', open);
          backdrop.setAttribute('data-open', open);
        } else {
          var collapsed = sidebar.getAttribute('data-collapsed') !== 'true';
          sidebar.setAttribute('data-collapsed', collapsed);
        }
      });
    }
    // คลิกฉากหลัง -> ปิด drawer
    if (backdrop && sidebar) {
      backdrop.addEventListener('click', function () {
        sidebar.setAttribute('data-open', 'false');
        backdrop.setAttribute('data-open', 'false');
      });
    }

    // ปุ่มลูกศรใน sidebar - คลิกเพื่อกาง/พับเมนูย่อย (ไม่กระทบลิงก์ชื่อเมนู)
    document.querySelectorAll('.nav-caret-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var group = btn.closest('.nav-group');
        if (group) {
          group.setAttribute('data-open', group.getAttribute('data-open') === 'true' ? 'false' : 'true');
        }
      });
    });

    // เมนูโปรไฟล์: เปิด/ปิด + คลิกนอกเมนูให้ปิด
    var pfToggle = document.getElementById('profile-toggle');
    var pfMenu   = document.getElementById('profile-menu');
    if (pfToggle && pfMenu) {
      pfToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        pfMenu.classList.toggle('is-open');
      });
      document.addEventListener('click', function (e) {
        if (!pfMenu.contains(e.target) && !pfToggle.contains(e.target)) {
          pfMenu.classList.remove('is-open');
        }
      });
    }
  })();
</script>
