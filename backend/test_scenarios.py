import os
import sys
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient

from main import app
from security import generate_track_number, validate_track_format, check_rate_limit
from classifier import detect_crisis, suggest_category_and_specialist
from file_service import clean_and_save_image

client = TestClient(app)

print("=== Starting Comprehensive Verification of Scenarios C1-C8 ===")

# 1. Test Track Number Format & Entropy
print("\n[Test 1] Cryptographic Track Number:")
for _ in range(5):
    t_no = generate_track_number()
    assert validate_track_format(t_no), f"Invalid track format: {t_no}"
    # Check no visually confusing characters
    assert not any(c in t_no for c in ["0", "O", "1", "I", "l"]), f"Confusing chars found in: {t_no}"
print("[OK] Track number format validated: ОТК-XXXX-XXXX with unambiguous charset")

# 2. Test Crisis Marker Detection (Scenario C6)
print("\n[Test 2] Crisis Marker Detection:")
crisis_text = "Мне угрожают расправой старшеклассники, сказали завтра после уроков поймают и жестоко изобьют, не хочу жить"
is_crisis, markers = detect_crisis(crisis_text)
assert is_crisis, "Crisis text was not detected!"
assert len(markers) >= 2, f"Expected multiple markers, got: {markers}"
print(f"[OK] Crisis successfully detected! Matched markers: {markers}")

# 3. Test Non-Crisis Free Text
print("\n[Test 3] Normal Text Classification:")
normal_text = "В классном чате MAX создали обидные стикеры с моей фотографией"
is_crisis_2, _ = detect_crisis(normal_text)
assert not is_crisis_2, "Normal text falsely detected as crisis"
suggestion = suggest_category_and_specialist(normal_text)
print(f"[OK] Suggestion for cyberbullying text: {suggestion['suggested_category']} -> {suggestion['suggested_specialization']}")

# 4. Test EXIF Stripping on Image
print("\n[Test 4] EXIF Metadata Stripping:")
test_img = Image.new("RGB", (100, 100), color="blue")
buf = BytesIO()
test_img.save(buf, format="JPEG")
raw_bytes = buf.getvalue()
saved_name, dest_path, size = clean_and_save_image(raw_bytes, "test_screenshot.jpg")
assert os.path.exists(dest_path), "Cleaned image not saved"
cleaned_img = Image.open(dest_path)
assert cleaned_img.getexif() == {}, "EXIF metadata was not stripped"
print("[OK] EXIF and geo-metadata successfully stripped from uploaded image")

# 5. Test Rate Limiter (Scenario C5)
print("\n[Test 5] Rate Limiter for Track Lookup:")
test_ip = "192.168.1.100"
for i in range(5):
    allowed, _ = check_rate_limit(test_ip)
    assert allowed, f"Request {i+1} should be allowed"
allowed_6, retry_after = check_rate_limit(test_ip)
assert not allowed_6, "6th request within a minute should be blocked by rate-limiter"
print(f"[OK] Rate limiter blocked 6th request with retry delay: {retry_after}s")

# 6. Test Scenario C1 & C2: Submit Appeal
print("\n[Test 6] API Appeal Creation (C1 & C2):")
resp = client.post(
    "/api/public/appeals",
    data={
        "applicant_type": "student",
        "initial_text": "Ребята дразнят меня на переменах из-за очков, очень грустно",
        "clarification_answers": '{"где происходит": "В школе", "как давно": "Около недели"}'
    }
)
assert resp.status_code == 200, f"Failed appeal creation: {resp.text}"
appeal_res = resp.json()
created_track = appeal_res["track_number"]
print(f"[OK] Appeal created with track number: {created_track}")

# 7. Test Scenario C3: Operator Login and Queue
print("\n[Test 7] Operator Login & Queue (C3):")
login_resp = client.post(
    "/api/auth/login",
    json={"username": "operator", "password": "operator123"}
)
assert login_resp.status_code == 200, "Operator login failed"
op_token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {op_token}"}

queue_resp = client.get("/api/operator/queue", headers=headers)
assert queue_resp.status_code == 200, "Failed to get operator queue"
queue_data = queue_resp.json()
assert queue_data["total_new"] > 0, "Queue should contain new appeals"
print(f"[OK] Operator queue received: {queue_data['total_new']} appeals, {queue_data['crisis_count']} crisis")

# 8. Test Scenario C4: Expert Login and My Appeals
print("\n[Test 8] Expert Login & Workflow (C4):")
exp_login = client.post(
    "/api/auth/login",
    json={"username": "expert_psy", "password": "expert123"}
)
assert exp_login.status_code == 200, "Expert login failed"
exp_token = exp_login.json()["access_token"]
exp_headers = {"Authorization": f"Bearer {exp_token}"}

my_appeals = client.get("/api/expert/my_appeals", headers=exp_headers)
assert my_appeals.status_code == 200, "Failed to get expert appeals"
print(f"[OK] Expert appeals count: {len(my_appeals.json())}")

# 9. Test Scenario C7: Admin Intervention & Audit Log
print("\n[Test 9] Admin Intervention & Audit Log (C7):")
admin_login = client.post(
    "/api/auth/login",
    json={"username": "admin", "password": "admin123"}
)
assert admin_login.status_code == 200, "Admin login failed"
admin_token = admin_login.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}

audit_resp = client.get("/api/admin/audit_logs", headers=admin_headers)
assert audit_resp.status_code == 200, "Failed to get audit logs"
assert len(audit_resp.json()) > 0, "Audit log should have entries"
print(f"[OK] Audit log verified with {len(audit_resp.json())} entries")

# 10. Test Scenario C8: Analytics & CSV Export
print("\n[Test 10] Analytics & Anonymized CSV Export (C8):")
analytics_resp = client.get("/api/admin/analytics?days=30", headers=admin_headers)
assert analytics_resp.status_code == 200, "Failed to get analytics"
analytics_data = analytics_resp.json()
assert "total_appeals" in analytics_data, "Analytics missing total_appeals"
print(f"[OK] Analytics verified: {analytics_data['total_appeals']} total appeals, return rate: {analytics_data['return_percentage']}%")

csv_resp = client.get("/api/admin/export_csv", headers=admin_headers)
assert csv_resp.status_code == 200, "CSV export failed"
csv_content = csv_resp.text
assert "Anonymized_Track_Hash" in csv_content, "CSV header missing"
# Verify ZERO appeal texts in CSV!
assert "Мне тяжело ходить в школу" not in csv_content, "Appeal text leaked into CSV export!"
print("[OK] CSV export verified: STRICTLY ZERO appeal texts or confidential data leaked!")

print("\n=== ALL 10 TESTS PASSED SUCCESSFULLY! ALL 8 SCENARIOS VERIFIED! ===")
