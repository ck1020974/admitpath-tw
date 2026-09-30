import unittest

from official_sieve_reviews import apply_review, load_reviews


class OfficialSieveReviewTests(unittest.TestCase):
    def test_high_risk_rows_match_official_image(self):
        reviews = load_reviews()
        self.assertEqual(reviews['114-personal_application-109022-114_apply']['rankedItems'][0]['score'], '55')
        self.assertEqual([row['score'] for row in reviews['115-personal_application-004582-115_apply']['rankedItems']], ['10', '5', '17', '12'])
        self.assertEqual([row['score'] for row in reviews['115-personal_application-023172-115_apply']['rankedItems']], ['7', '20'])

    def test_restores_reviewed_result_and_clears_pending_marker(self):
        record = {
            'id': '115-personal_application-003422-115_apply',
            'applySieveResult': {
                'rankedItems': [{'rank': 1, 'subjects': ['英文'], 'score': '', 'label': '英文待核對'}],
                'scoreReviewPending': [{'rank': 1, 'subjects': ['英文'], 'ocrScore': '24'}],
            },
        }
        review = {
            'sourceUrl': 'https://www.cac.edu.tw/example.png',
            'rankedItems': [{'rank': 1, 'multiplier': '3', 'subjects': ['英文'], 'score': '11', 'label': '英文11'}],
        }
        self.assertTrue(apply_review(record, review))
        result = record['applySieveResult']
        self.assertEqual(result['sieveResultStandard'], '英文11')
        self.assertEqual(result['sieveResultItems'][0]['score'], '11')
        self.assertNotIn('scoreReviewPending', result)
        self.assertEqual(result['verification']['method'], 'official-image-visual-review')

    def test_rejects_impossible_reviewed_score(self):
        record = {'id': 'x', 'applySieveResult': {}}
        review = {'sourceUrl': 'https://www.cac.edu.tw/example.png',
                  'rankedItems': [{'rank': 1, 'subjects': ['社會'], 'score': '43'}]}
        with self.assertRaises(ValueError):
            apply_review(record, review)


if __name__ == '__main__':
    unittest.main()
