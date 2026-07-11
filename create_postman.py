import json
import uuid

base_url = "https://7q7gdq1rke.execute-api.ap-south-1.amazonaws.com"

endpoints = [
  ("GET", "/api/v1/auth/captcha", None),
  ("POST", "/api/v1/auth/login", {
      "email": "test@example.com",
      "password": "Password123!",
      "captchaId": "{{captchaId}}",
      "captchaText": "1234"
  }),
  ("POST", "/api/v1/auth/register", {
      "email": "test@example.com",
      "password": "Password123!",
      "confirmPassword": "Password123!",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "mobileNumber": "9876543210",
      "captchaId": "{{captchaId}}",
      "captchaText": "1234",
      "cognitoSubId": "123e4567-e89b-12d3-a456-426614174000"
  }),
  ("POST", "/api/v1/auth/candidate/register", {
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-01",
      "mobileNumber": "9876543210",
      "email": "candidate@example.com",
      "password": "Password123!",
      "confirmPassword": "Password123!",
      "cognitoSubId": "123e4567-e89b-12d3-a456-426614174000"
  }),
  ("POST", "/api/v1/auth/candidate/registration", {
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-01",
      "mobileNumber": "9876543210",
      "email": "candidate@example.com",
      "password": "Password123!",
      "confirmPassword": "Password123!",
      "cognitoSubId": "123e4567-e89b-12d3-a456-426614174000"
  }),
  ("PATCH", "/api/v1/auth/candidate/step-1", {
      "personalInfo": {
          "fullName": "John Doe",
          "fathersName": "Richard Doe",
          "motherName": "Jane Doe",
          "dob": "01-01-1990",
          "age": 30,
          "gender": "male",
          "nationality": "Indian",
          "aadharNumber": "123456789012",
          "identificationMark1": "A mole on right cheek",
          "mobileNumber": "9876543210",
          "emailId": "candidate@example.com",
          "permanentAddress": {
              "street": "123 Main St",
              "post": "Central Post Office",
              "state": "Bihar",
              "district": "Patna",
              "pincode": "800001",
              "cityOrVillage": "Patna"
          },
          "sameAsPermanent": True
      },
      "reservationCategory": {
          "isLocallyResident": True,
          "isJharkhandDomicile": True,
          "domicileCertificateNumber": "DOM-BIH-2026-99282",
          "mainCategory": 1,
          "isPwd": False,
          "isExServiceman": False,
          "isSportsQuota": False,
          "declaration": True
      }
  }),
  ("PATCH", "/api/v1/auth/candidate/step-2", {
      "paymentMode": "online_upi"
  }),
  ("PATCH", "/api/v1/auth/candidate/step-3", {
      "highestQualification": "graduation",
      "tenth": {
          "board": "BSEB",
          "percentage": "80",
          "totalMarks": "500",
          "marksObtained": "400",
          "passingCertificateNo": "10TH-123",
          "passingYear": "2011"
      },
      "graduation": {
          "degreeId": 1,
          "university": "Patna University",
          "percentage": "72.3",
          "totalMarks": "1000",
          "marksObtained": "723",
          "passingCertificateNo": "GRAD-112998",
          "passingYear": "2016"
      }
  }),
  ("PATCH", "/api/v1/auth/candidate/step-4", {
      "photograph": "{{documentId}}",
      "signatureEnglish": "{{documentId}}",
      "signatureHindi": "{{documentId}}"
  }),
  ("PATCH", "/api/v1/auth/candidate/step-5", {
      "livePhoto": "{{documentId}}"
  }),
  ("PATCH", "/api/v1/auth/candidate/step-6", {
      "postPreferences": {
          "vacancyStream": "both",
          "isRegular": True,
          "isBacklog": True,
          "postRankings": [
              {
                  "postCode": "101",
                  "priority": 1
              }
          ]
      }
  }),
  ("POST", "/api/v1/auth/refresh-token", {
      "refreshToken": "some-refresh-token",
      "email": "test@example.com"
  }),
  ("POST", "/api/v1/auth/forgot-password", {
      "email": "test@example.com",
      "captchaId": "{{captchaId}}",
      "captchaText": "1234"
  }),
  ("POST", "/api/v1/auth/reset-password", {
      "token": "reset-token-here",
      "newPassword": "Password123!",
      "confirmPassword": "Password123!"
  }),
  ("POST", "/api/v1/auth/change-password", {
      "currentPassword": "OldPassword123!",
      "newPassword": "NewPassword123!",
      "confirmNewPassword": "NewPassword123!"
  }),
  ("POST", "/api/v1/auth/logout", {}),
  ("GET", "/api/v1/auth/profile", None),
  ("GET", "/api/v1/auth/candidates", None),
  ("POST", "/api/v1/auth/seed-dummy", {}),
  ("POST", "/api/v1/otp/mobile/send", {
      "mobileNumber": "9876543210",
      "purpose": "registration"
  }),
  ("POST", "/api/v1/otp/mobile/verify", {
      "otpRequestId": "{{otpRequestId}}",
      "otp": "123456"
  }),
  ("POST", "/api/v1/otp/email/send", {
      "email": "test@example.com",
      "purpose": "registration"
  }),
  ("POST", "/api/v1/otp/email/verify", {
      "otpRequestId": "{{otpRequestId}}",
      "otp": "123456"
  }),
  ("POST", "/api/v1/otp/resend", {
      "otpRequestId": "{{otpRequestId}}"
  }),
  ("GET", "/api/v1/application", None),
  ("GET", "/api/v1/application/steps/all", None),
  ("GET", "/api/v1/application/{{applicationId}}/steps", None),
  ("GET", "/api/v1/application/{{applicationId}}", None),
  ("POST", "/api/v1/application/{{applicationId}}/step/1", {
      "mainCategory": 1,
      "subCategory": 0,
      "isPwd": False,
      "isExServiceman": False,
      "isSportsQuota": False,
      "isJharkhandDomicile": True,
      "declaration": True
  }),
  ("POST", "/api/v1/application/{{applicationId}}/step/2", {
      "highestQualification": "graduation",
      "qualifications": [
          {
              "level": "graduation",
              "boardUniversity": "Ranchi University",
              "institutionName": "St. Xavier's College",
              "degree": "B.Sc",
              "yearOfPassing": 2018,
              "totalMarks": 1000,
              "marksObtained": 750,
              "percentage": 75,
              "jobQualificationId": 1
          }
      ],
      "experience": {
          "hasExperience": True,
          "durationMonths": "6",
          "durationYears": "2",
          "organization": "Tech Corp",
          "designation": "Developer"
      }
  }),
  ("POST", "/api/v1/application/{{applicationId}}/step/3", {
      "vacancyStream": "both",
      "isRegular": True,
      "isBacklog": True,
      "postRankings": [
          {
              "postId": 1,
              "priority": 1
          }
      ]
  }),
  ("POST", "/api/v1/application/{{applicationId}}/step/4", {
      "paperOneLanguage": "Hindi",
      "paperTwoLanguage": "English",
      "paperThreeLanguage": "Santhali"
  }),
  ("POST", "/api/v1/application/{{applicationId}}/step/5", {
      "centers": [
          {
              "centreCode": "RNC01",
              "centreName": "Ranchi Centre 1",
              "state": "Jharkhand",
              "priority": 1
          }
      ]
  }),
  ("POST", "/api/v1/application/{{applicationId}}/step/6", {
      "tenthMarksheet": "{{documentId}}",
      "signature": "{{documentId}}",
      "photo": "{{documentId}}",
      "declarationAccepted": True
  }),
  ("POST", "/api/v1/application/{{applicationId}}/step/7", {
      "paymentMode": "online_upi",
      "feeCategory": "general"
  }),
  ("POST", "/api/v1/application/{{applicationId}}/step/8", {
      "declarationAccepted": True,
      "termsAccepted": True,
      "confirmationText": "I CONFIRM"
  }),
  ("GET", "/api/v1/application/{{applicationId}}/step/{stepNumber}", None),
  ("POST", "/api/v1/application/{{applicationId}}/submit", {}),
  ("POST", "/api/v1/application/{{applicationId}}/submit-final", {
      "declarationAccepted": True,
      "termsAccepted": True,
      "confirmationText": "I CONFIRM"
  }),
  ("GET", "/api/v1/application/{{applicationId}}/print", None),
  ("POST", "/api/v1/documents/upload", {
      "file": "binary_data_here"
  }),
  ("GET", "/api/v1/documents", None),
  ("GET", "/api/v1/documents/{{documentId}}/download", None),
  ("DELETE", "/api/v1/documents/{{documentId}}", None),
  ("POST", "/api/v1/payment/initiate", {
      "applicationId": "{{applicationId}}"
  }),
  ("POST", "/api/v1/payment/verify", {
      "orderId": "order_123",
      "paymentId": "pay_123",
      "signature": "sig_123"
  }),
  ("GET", "/api/v1/payment/{{applicationId}}/status", None),
  ("GET", "/api/v1/payment/fee-structure", None),
  ("GET", "/api/v1/payment/{paymentOrderId}/invoice", None),
  ("GET", "/api/v1/countries", None),
  ("GET", "/api/v1/countries/{countryId}/states", None),
  ("GET", "/api/v1/states/{stateId}/districts", None),
  ("GET", "/api/v1/public/type-of-ex-officer", None),
  ("GET", "/api/v1/dashboard", None),
  ("GET", "/api/v1/dashboard/notifications", None),
  ("GET", "/api/v1/dashboard/admit-card", None),
  ("GET", "/api/v1/dashboard/result", None),
  ("POST", "/api/v1/subjects/seed", {}),
  ("POST", "/api/v1/subjects", {
      "name": "Mathematics",
      "code": "MATH"
  }),
  ("GET", "/api/v1/subjects", None),
  ("POST", "/api/v1/degrees/seed", {}),
  ("POST", "/api/v1/degrees", {
      "name": "B.Tech",
      "level": "graduation"
  }),
  ("GET", "/api/v1/degrees", None),
  ("POST", "/api/v1/categories/seed", {}),
  ("POST", "/api/v1/categories", {
      "name": "General",
      "code": "GEN"
  }),
  ("GET", "/api/v1/categories", None),
  ("GET", "/api/v1/admin/stats", None),
  ("GET", "/api/v1/admin/candidates", None),
  ("GET", "/api/v1/admin/candidates/{candidateId}", None),
  ("GET", "/api/v1/admin/candidates/{candidateId}/documents", None),
  ("GET", "/api/v1/admin/candidates/export/xlsx", None),
  ("PATCH", "/api/v1/admin/documents/{{documentId}}/verify", {
      "status": "verified",
      "comments": "Looks good"
  })
]

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "BSSC API Collection",
        "description": "Postman collection with valid payloads for BSSC API",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {
            "key": "baseUrl",
            "value": base_url,
            "type": "string"
        },
        {
            "key": "token",
            "value": "",
            "type": "string"
        },
        {
            "key": "applicationId",
            "value": "1",
            "type": "string"
        },
        {
            "key": "captchaId",
            "value": "",
            "type": "string"
        },
        {
            "key": "otpRequestId",
            "value": "",
            "type": "string"
        },
        {
            "key": "documentId",
            "value": "123e4567-e89b-12d3-a456-426614174000",
            "type": "string"
        }
    ],
    "item": []
}

# Grouping items into folders
folders = {
    "Auth": [],
    "Candidate Auth": [],
    "OTP": [],
    "Application": [],
    "Documents": [],
    "Payment": [],
    "Dashboard": [],
    "Admin": [],
    "Master Data": []
}

for method, path, payload in endpoints:
    url_path = path.replace("{applicationId}", "{{applicationId}}").replace("{documentId}", "{{documentId}}").replace("{otpRequestId}", "{{otpRequestId}}")
    
    item = {
        "name": f"{method} {path}",
        "request": {
            "method": method,
            "header": [
                {
                    "key": "Content-Type",
                    "value": "application/json",
                    "type": "text"
                },
                {
                    "key": "Authorization",
                    "value": "Bearer {{token}}",
                    "type": "text"
                }
            ],
            "url": {
                "raw": f"{{{{baseUrl}}}}{url_path}",
                "host": [
                    "{{baseUrl}}"
                ],
                "path": [p.replace("{", ":").replace("}", "") if "{" in p and "{{" not in p else p for p in url_path.split("/") if p],
                "variable": [
                    {"key": p.replace("{", "").replace("}", ""), "value": "1"}
                    for p in url_path.split("/") if "{" in p and "{{" not in p
                ]
            }
        },
        "response": []
    }
    
    if payload is not None:
        item["request"]["body"] = {
            "mode": "raw",
            "raw": json.dumps(payload, indent=4),
            "options": {
                "raw": {
                    "language": "json"
                }
            }
        }
    elif method in ["POST", "PATCH", "PUT"]:
        item["request"]["body"] = {
            "mode": "raw",
            "raw": "{}",
            "options": {
                "raw": {
                    "language": "json"
                }
            }
        }

    # Add scripts to extract variables
    script_exec = []
    
    if method == "POST" and ("/login" in path or "/register" in path or "/registration" in path):
        script_exec.extend([
            "var jsonData = pm.response.json();",
            "if (jsonData && jsonData.data) {",
            "    let token = jsonData.data.token || jsonData.data.accessToken;",
            "    if (token) pm.collectionVariables.set('token', token);",
            "}"
        ])
    
    if method == "GET" and "/captcha" in path:
        script_exec.extend([
            "var jsonData = pm.response.json();",
            "if (jsonData && jsonData.data && jsonData.data.captchaId) {",
            "    pm.collectionVariables.set('captchaId', jsonData.data.captchaId);",
            "}"
        ])
        
    if method == "GET" and "/application" == path:
        script_exec.extend([
            "var jsonData = pm.response.json();",
            "if (jsonData && jsonData.data && jsonData.data.id) {",
            "    pm.collectionVariables.set('applicationId', jsonData.data.id);",
            "}"
        ])
        
    if method == "POST" and "/otp" in path and "/send" in path:
        script_exec.extend([
            "var jsonData = pm.response.json();",
            "if (jsonData && jsonData.data && jsonData.data.otpRequestId) {",
            "    pm.collectionVariables.set('otpRequestId', jsonData.data.otpRequestId);",
            "}"
        ])
        
    if method == "POST" and "/documents/upload" in path:
        script_exec.extend([
            "var jsonData = pm.response.json();",
            "if (jsonData && jsonData.data && jsonData.data.documentId) {",
            "    pm.collectionVariables.set('documentId', jsonData.data.documentId);",
            "}"
        ])

    if script_exec:
        item["event"] = [
            {
                "listen": "test",
                "script": {
                    "type": "text/javascript",
                    "exec": script_exec
                }
            }
        ]

    # Assign to proper folder
    if "/api/v1/auth/candidate" in path:
        folders["Candidate Auth"].append(item)
    elif "/api/v1/auth" in path:
        folders["Auth"].append(item)
    elif "/api/v1/otp" in path:
        folders["OTP"].append(item)
    elif "/api/v1/application" in path:
        folders["Application"].append(item)
    elif "/api/v1/documents" in path:
        folders["Documents"].append(item)
    elif "/api/v1/payment" in path:
        folders["Payment"].append(item)
    elif "/api/v1/dashboard" in path:
        folders["Dashboard"].append(item)
    elif "/api/v1/admin" in path:
        folders["Admin"].append(item)
    else:
        folders["Master Data"].append(item)

# Build the final item array with folders
for folder_name, items in folders.items():
    if items:
        collection["item"].append({
            "name": folder_name,
            "item": items
        })

with open("BSSC_API_Collection.postman_collection.json", "w") as f:
    json.dump(collection, f, indent=4)
print("Created advanced grouped BSSC_API_Collection.postman_collection.json")
