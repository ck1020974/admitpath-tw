import unittest

from apply_sieve_score_guard import sanitize_record, score_is_impossible
from audit_apply_data import audit_records


class ApplySieveScoreGuardTests(unittest.TestCase):
    def test_art_scores_keep_their_own_range(self):
        self.assertFalse(score_is_impossible({'subjects': ['主修'], 'score': '84.36'}))
        self.assertFalse(score_is_impossible({'subjects': ['素描', '彩繪技法', '創意表現'], 'score': '231'}))
        self.assertTrue(score_is_impossible({'subjects': ['英文'], 'score': '84.36'}))
        self.assertTrue(score_is_impossible({'subjects': ['主修'], 'score': '101'}))
        self.assertTrue(score_is_impossible({'subjects': ['APCS識讀', 'APCS實作'], 'score': '11'}))

    def test_user_reported_correction_preserves_combined_score(self):
        record = {
            'id': '115-personal_application-002092-115_apply',
            'applySieveResult': {
                'rankedItems': [
                    {'rank': 1, 'subjects': ['國文', '英文', '數B', '社會'], 'score': '44', 'label': '國文+英文+數B+社會44'},
                    {'rank': 2, 'subjects': ['社會'], 'score': '43', 'label': '社會43'},
                ],
                'sieveResultItems': [],
                'sieveResultStandard': '國文+英文+數B+社會44、社會43',
            },
        }
        self.assertTrue(sanitize_record(record))
        result = record['applySieveResult']
        self.assertEqual(result['rankedItems'][0]['score'], '44')
        self.assertEqual(result['rankedItems'][1]['score'], '13')
        self.assertEqual(result['sieveResultStandard'], '國文+英文+數B+社會44、社會13')

    def test_unknown_invalid_single_is_withheld(self):
        record = {
            'id': 'other',
            'admissionAudit': {'resultStatus': 'verified'},
            'applySieveResult': {
                'rankedItems': [
                    {'rank': 1, 'subjects': ['英文'], 'score': '24', 'label': '英文24'},
                    {'rank': 2, 'subjects': ['國文', '英文'], 'score': '24', 'label': '國文+英文24'},
                ],
                'sieveResultItems': [
                    {'type': 'single', 'subjects': ['英文'], 'score': '24', 'label': '英文24'},
                    {'type': 'combined', 'subjects': ['國文', '英文'], 'score': '24', 'label': '國文+英文24'},
                ],
                'sieveResultStandard': '英文24、國文+英文24',
            },
        }
        self.assertTrue(sanitize_record(record))
        result = record['applySieveResult']
        self.assertEqual(result['rankedItems'][0]['score'], '')
        self.assertEqual(result['rankedItems'][0]['label'], '英文待核對')
        self.assertEqual(result['sieveResultStandard'], '國文+英文24')
        self.assertEqual(result['sieveResultItems'], [{'type': 'combined', 'subjects': ['國文', '英文'], 'score': '24', 'label': '國文+英文24'}])
        self.assertEqual(record['admissionAudit']['resultStatus'], 'pending')
        self.assertFalse(sanitize_record(record))

    def test_audit_does_not_verify_pending_ocr_score(self):
        record = {
            'id': 'other', 'year': 115, 'channelKey': 'personal_application',
            'programCode': '123456', 'departmentName': '測試系', 'schoolName': '測試大學',
            'detailUrl': '', 'cacDetail': {},
            'applySieveResult': {'rankedItems': [{'rank': 1, 'subjects': ['英文'], 'score': '24', 'label': '英文24'}],
                                 'sieveResultItems': [], 'sieveResultStandard': '英文24',
                                 'verification': {'method': 'official_rapidocr'}},
        }
        audit_records([record], {}, {})
        self.assertEqual(record['admissionAudit']['resultStatus'], 'pending')
        self.assertEqual(record['applySieveResult']['rankedItems'][0]['score'], '')


if __name__ == '__main__':
    unittest.main()
