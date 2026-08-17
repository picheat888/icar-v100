<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<div class="empty-card empty-card--flat">
  <div class="icon-box empty-icon empty-icon--gray">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="7" y1="13" x2="12" y2="13"/><line x1="7" y1="17" x2="14" y2="17"/></svg>
  </div>
  <h2 class="title">ประวัติการใช้งาน (Activity Log)</h2>
  <p class="subtext">บันทึกกิจกรรม + ฟิลเตอร์วันที่ + Export CSV - จะทำในเฟส 6</p>
</div>
<?= $this->endSection() ?>
