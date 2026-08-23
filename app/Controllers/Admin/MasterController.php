<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\DepartmentModel;
use App\Models\PositionModel;
use App\Models\UserProfileModel;

/**
 * ข้อมูลหลัก (Admin) - จัดการแผนก/ตำแหน่ง + JSON endpoint ให้ React island
 */
class MasterController extends BaseController
{
    // เลือก model ตามชนิด (dept/position)
    private function modelFor(string $type)
    {
        return $type === 'position' ? new PositionModel() : new DepartmentModel();
    }

    // ชนิดที่รับได้ - นอกเหนือจากนี้ตีกลับ ไม่ตกไปที่แผนกเงียบ ๆ
    private const TYPES = ['dept', 'position'];

    /**
     * จัดรูปชื่อก่อนตรวจ - ตัดอักขระที่มองไม่เห็น (zero-width, format char) แล้วยุบช่องว่าง
     * ทุกชนิดรวมขึ้นบรรทัดใหม่และแท็บให้เหลือช่องเดียว ชื่อที่ตาอ่านว่าเหมือนกันจึงซ้ำกันจริง
     */
    private function normalizeName(?string $raw): string
    {
        $name = preg_replace('/[\p{Cf}\x{200B}-\x{200D}\x{FEFF}]/u', '', (string) $raw);

        return trim((string) preg_replace('/\s+/u', ' ', $name));
    }

    // เดิมเป็นหน้า "ข้อมูลหลัก" - แยกเป็นเมนูย่อย แผนก/ตำแหน่ง ใต้จัดการสมาชิก
    public function index()
    {
        return redirect()->to(site_url('admin/departments'));
    }

    // หน้าจัดการแผนก (เมนูย่อยใต้จัดการสมาชิก)
    public function departments()
    {
        return view('admin/master/single', [
            'active'       => 'dept',
            'pageTitle'    => lang('Page.dept'),
            'pageSubtitle' => lang('Page.dept_sub'),
            'only'         => 'dept',
        ]);
    }

    // หน้าจัดการตำแหน่ง (เมนูย่อยใต้จัดการสมาชิก)
    public function positions()
    {
        return view('admin/master/single', [
            'active'       => 'position',
            'pageTitle'    => lang('Page.position'),
            'pageSubtitle' => lang('Page.position_sub'),
            'only'         => 'position',
        ]);
    }

    // JSON: รายการแผนก + ตำแหน่ง
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        return $this->response->setJSON([
            'departments' => (new DepartmentModel())->orderBy('name')->findAll(),
            'positions'   => (new PositionModel())->orderBy('name')->findAll(),
        ]);
    }

    // POST: เพิ่มแผนก/ตำแหน่ง
    public function add()
    {
        $type  = (string) $this->request->getPost('type');
        if (! in_array($type, self::TYPES, true)) {
            return $this->fail(lang('Master.err_type_invalid'));
        }
        $name  = $this->normalizeName($this->request->getPost('name'));
        $model = $this->modelFor($type);
        $label    = $type === 'position' ? lang('Master.type_position') : lang('Master.type_dept');
        $logLabel = $type === 'position' ? lang('Master.type_position', [], 'en') : lang('Master.type_dept', [], 'en');

        if ($name === '') {
            return $this->fail(lang('Master.err_name_req', [$label]));
        }
        if (mb_strlen($name) > 150) {
            return $this->fail(lang('Master.err_name_max', [$label]));
        }
        // เช็คชื่อซ้ำก่อน (กันชน unique constraint ที่ DB จะ throw)
        if ($model->where('name', $name)->first()) {
            return $this->fail(lang('Master.err_dupe', [$label]));
        }

        // ตรวจผลการบันทึกจริง - ไม่ผ่าน model validation/DB ห้ามรายงานว่าสำเร็จ
        // ห่อ try/catch กันชนชื่อซ้ำระดับ DB (unique constraint)
        try {
            if ($model->insert(['name' => $name]) === false) {
                return $this->fail(lang('Master.err_dupe', [$label]));
            }
        } catch (\CodeIgniter\Database\Exceptions\DatabaseException $e) {
            return $this->fail(lang('Master.err_dupe', [$label]));
        }

        log_activity("Added {$logLabel} {$name}");

        return $this->ok(lang('Master.added', [$label]));
    }

    // POST: แก้ไขชื่อแผนก/ตำแหน่ง
    public function update()
    {
        $type  = (string) $this->request->getPost('type');
        if (! in_array($type, self::TYPES, true)) {
            return $this->fail(lang('Master.err_type_invalid'));
        }
        $id    = (int) $this->request->getPost('id');
        $name  = $this->normalizeName($this->request->getPost('name'));
        $model = $this->modelFor($type);
        $label    = $type === 'position' ? lang('Master.type_position') : lang('Master.type_dept');
        $logLabel = $type === 'position' ? lang('Master.type_position', [], 'en') : lang('Master.type_dept', [], 'en');

        if (! $model->find($id)) {
            return $this->fail(lang('Master.err_not_found', [$label]), true);
        }
        if ($name === '') {
            return $this->fail(lang('Master.err_name_req', [$label]));
        }
        if (mb_strlen($name) > 150) {
            return $this->fail(lang('Master.err_name_max', [$label]));
        }
        // เช็คชื่อซ้ำ (ยกเว้นตัวเอง)
        if ($model->where('name', $name)->where('id !=', $id)->first()) {
            return $this->fail(lang('Master.err_dupe', [$label]));
        }

        // ตรวจผลการบันทึกจริง - กันรายงานสำเร็จทั้งที่เขียนไม่ลง
        // ห่อ try/catch กันชนชื่อซ้ำระดับ DB (unique constraint)
        try {
            if ($model->update($id, ['name' => $name]) === false) {
                return $this->fail(lang('Master.err_dupe', [$label]));
            }
        } catch (\CodeIgniter\Database\Exceptions\DatabaseException $e) {
            return $this->fail(lang('Master.err_dupe', [$label]));
        }

        log_activity("Renamed {$logLabel} → {$name}");

        return $this->ok(lang('Master.saved', [$label]));
    }

    // POST: ลบแผนก/ตำแหน่ง (FK ตั้ง SET NULL - ผู้ใช้ที่อ้างถึงจะถูกล้างค่า)
    public function delete()
    {
        $type  = (string) $this->request->getPost('type');
        if (! in_array($type, self::TYPES, true)) {
            return $this->fail(lang('Master.err_type_invalid'));
        }
        $id    = (int) $this->request->getPost('id');
        $model = $this->modelFor($type);
        $label    = $type === 'position' ? lang('Master.type_position') : lang('Master.type_dept');
        $logLabel = $type === 'position' ? lang('Master.type_position', [], 'en') : lang('Master.type_dept', [], 'en');

        $item = $model->find($id);
        if (! $item) {
            return $this->fail(lang('Master.err_not_found', [$label]), true);
        }

        // กันลบถ้ายังมีพนักงานอยู่ใน แผนก/ตำแหน่ง นี้ - ต้องย้ายพนักงานออกก่อน
        $column = $type === 'position' ? 'position_id' : 'department_id';
        $count  = (new UserProfileModel())->where($column, $id)->countAllResults();
        if ($count > 0) {
            return $this->fail(lang('Master.err_in_use', [$label, $count]));
        }

        $model->delete($id);

        log_activity("Deleted {$logLabel} " . ($item['name'] ?? ''));

        return $this->ok(lang('Master.deleted', [$label]));
    }

    // ===== helper ตอบ JSON พร้อม csrf ใหม่ =====
    private function ok(string $message)
    {
        return $this->response->setJSON(['ok' => true, 'message' => $message, 'csrf' => csrf_hash()]);
    }

    // $conflict = true -> ข้อมูลนี้เพิ่งถูกคนอื่นเปลี่ยนสถานะไปแล้ว (ให้ฝั่งหน้าจอดึงข้อมูลใหม่)
    private function fail(string $message, bool $conflict = false)
    {
        $out = ['ok' => false, 'message' => $message, 'csrf' => csrf_hash()];
        if ($conflict) {
            $out['conflict'] = true;
        }

        return $this->response->setStatusCode(422)->setJSON($out);
    }
}
