"""Synthetic-only tests for private roster preparation."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import openpyxl

spec = importlib.util.spec_from_file_location("prepare", Path(__file__).with_name("prepare_student_roster.py"))
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class RosterTests(unittest.TestCase):
    def write_book(self, filename, duplicate=False):
        workbook = openpyxl.Workbook()
        one = workbook.active
        one.title = "1001"
        one.append(["原班級", "座號", "中文姓名", "學號"])
        one.append(["1001", "01", "虛構甲", "ZZ00001"])
        group = workbook.create_sheet("10A")
        group.append(["原班級", "座號", "中文姓名", "學號"])
        group.append(["1002", "08", "虛構乙", "ZZ00001" if duplicate else "ZZ00002"])
        workbook.save(filename)

    def test_group_original_class_and_identifiers(self):
        with tempfile.TemporaryDirectory() as folder:
            filename = Path(folder) / "synthetic.xlsx"
            self.write_book(filename)
            a = prepare.read_roster(filename)
            b = prepare.read_roster(filename)
            self.assertEqual(a, b, "same roster must retain stable identities")
            student = a["students"][1]
            self.assertEqual(student["teachingGroup"], "10A")
            self.assertEqual(student["originalClass"], "1002")
            self.assertEqual(student["originalSeatNumber"], "08")
            self.assertEqual(student["studentId"], "ZZ00002")
            self.assertNotIn("password", student)

    def test_duplicate_id_stops_import(self):
        with tempfile.TemporaryDirectory() as folder:
            filename = Path(folder) / "duplicate.xlsx"
            self.write_book(filename, duplicate=True)
            with self.assertRaisesRegex(ValueError, "Duplicate"):
                prepare.read_roster(filename)


if __name__ == "__main__":
    unittest.main()
