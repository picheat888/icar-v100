<?php
/**
 * Scripts - JS ส่วนกลางของ app shell
 * - ยุบ/ขยาย sidebar (desktop = icon-rail, จอแคบ = drawer ทับ)
 * - เปิด/ปิดเมนูโปรไฟล์
 */
?>
<!-- ฉากหลังทึบตอนเปิด drawer (จอแคบ) -->
<div id="sidebar-backdrop" class="sidebar-backdrop" data-open="false" aria-hidden="true"></div>

<script>
  (function () {
    var sidebar  = document.querySelector('.app-sidebar');
    var toggle   = document.getElementById('sidebar-toggle');
    var backdrop = document.getElementById('sidebar-backdrop');
    var isNarrow = function () { return window.matchMedia('(max-width:860px)').matches; };
    var STORE    = 'icar.sidebar.collapsed';

    // ตอนยุบเหลือไอคอน ชื่อเมนูถูกซ่อนจากสายตา - ใส่ tooltip ให้รู้ว่าไอคอนไหนคืออะไร
    function syncTitles(collapsed) {
      document.querySelectorAll('.nav-item, .nav-logout').forEach(function (el) {
        var label = el.querySelector('.nav-label');
        if (! label) return;
        if (collapsed) { el.setAttribute('title', label.textContent.trim()); }
        else { el.removeAttribute('title'); }
      });
    }

    // สถานะปุ่ม hamburger: จอแคบสื่อว่า drawer เปิดอยู่ไหม จอกว้างสื่อว่าเมนูกางอยู่ไหม
    function syncToggleState() {
      if (! toggle || ! sidebar) return;
      var expanded = isNarrow()
        ? sidebar.getAttribute('data-open') === 'true'
        : sidebar.getAttribute('data-collapsed') !== 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    // เปิด/ปิด drawer จอแคบ
    function setDrawer(open) {
      sidebar.setAttribute('data-open', open ? 'true' : 'false');
      backdrop.setAttribute('data-open', open ? 'true' : 'false');
      syncToggleState();
    }

    if (sidebar) {
      syncTitles(sidebar.getAttribute('data-collapsed') === 'true');
      syncToggleState();
    }

    // ปุ่ม hamburger: จอแคบ -> เปิด drawer, จอกว้าง -> ยุบ/ขยาย (จำไว้ใน localStorage)
    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        if (isNarrow()) {
          setDrawer(sidebar.getAttribute('data-open') !== 'true');
        } else {
          var collapsed = sidebar.getAttribute('data-collapsed') !== 'true';
          sidebar.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
          syncTitles(collapsed);
          syncToggleState();
          try { localStorage.setItem(STORE, collapsed ? 'true' : 'false'); } catch (e) {}
        }
      });
    }
    // คลิกฉากหลัง -> ปิด drawer
    if (backdrop && sidebar) {
      backdrop.addEventListener('click', function () { setDrawer(false); });
    }
    // Esc -> ปิด drawer แล้วคืนโฟกัสให้ปุ่ม hamburger
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || ! sidebar) return;
      if (isNarrow() && sidebar.getAttribute('data-open') === 'true') {
        setDrawer(false);
        if (toggle) toggle.focus();
      }
    });
    // สลับช่วงจอกว้าง/แคบ - ความหมายของปุ่ม hamburger เปลี่ยนตาม
    window.matchMedia('(max-width:860px)').addEventListener('change', syncToggleState);

    // ปุ่มลูกศรใน sidebar - คลิกเพื่อกาง/พับเมนูย่อย (ไม่กระทบลิงก์ชื่อเมนู)
    document.querySelectorAll('.nav-caret-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var group = btn.closest('.nav-group');
        if (! group) return;
        var open = group.getAttribute('data-open') !== 'true';
        group.setAttribute('data-open', open ? 'true' : 'false');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
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
