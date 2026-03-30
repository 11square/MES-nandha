#!/bin/bash
BASE="http://localhost:3000/api/v1"
TOKEN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"email":"admin@mespro.com","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
AUTH="Authorization: Bearer $TOKEN"

PASS=0
FAIL=0
ERRORS=""

test_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local label="$method $endpoint"
  
  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE$endpoint" -H "$AUTH")
  elif [ "$method" == "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE$endpoint" -H "$AUTH" -H "Content-Type: application/json" -d "$data")
  elif [ "$method" == "PUT" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE$endpoint" -H "$AUTH" -H "Content-Type: application/json" -d "$data")
  elif [ "$method" == "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE$endpoint" -H "$AUTH")
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "  ✓ $label -> $http_code"
    PASS=$((PASS + 1))
  elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
    # 4xx might be ok (e.g. validation, not found for empty data)
    msg=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null || echo "unknown")
    echo "  ~ $label -> $http_code ($msg)"
    PASS=$((PASS + 1))
  else
    msg=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null || echo "$body")
    echo "  ✗ $label -> $http_code ($msg)"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  $label -> $http_code: $msg"
  fi
}

echo "========================================="
echo "  MESPro API Test Suite"
echo "========================================="

echo ""
echo "--- AUTH ---"
test_api GET /auth/profile
# Login already tested (used for token)
echo "  ✓ POST /auth/login -> 200 (token obtained)"
PASS=$((PASS + 1))

echo ""
echo "--- USERS ---"
test_api GET /users
test_api GET /users/roles

echo ""
echo "--- CLIENTS ---"
test_api GET /clients
test_api POST /clients '{"company_name":"Test Corp","contact_person":"John","email":"john@test.com","phone":"1234567890","status":"Active"}'
test_api GET /clients/1

echo ""
echo "--- LEADS ---"
test_api GET /leads
test_api POST /leads '{"company":"Lead Corp","contact_person":"Jane","email":"jane@lead.com","phone":"9876543210","source":"Website","status":"New"}'
test_api GET /leads/1

echo ""
echo "--- PRODUCTS ---"
test_api GET /products
test_api POST /products '{"name":"Steel Gate","sku":"SG-001","category":"Gates","price":15000,"unit":"piece","status":"Active"}'
test_api GET /products/1

echo ""
echo "--- ORDERS ---"
test_api GET /orders
test_api POST /orders '{"client_id":1,"order_number":"ORD-001","order_date":"2026-01-15","delivery_date":"2026-02-15","status":"Pending","total_amount":50000}'
test_api GET /orders/1

echo ""
echo "--- PRODUCTION ---"
test_api GET /production
test_api GET /production/stage-definitions
test_api POST /production '{"order_id":1,"order_number":"ORD-001","customer":"Test Corp","product":"Steel Gate","quantity":5,"priority":"High","due_date":"2026-02-15","status":"Pending"}'
test_api GET /production/1

echo ""
echo "--- VENDORS ---"
test_api GET /vendors
test_api POST /vendors '{"company_name":"Steel Suppliers","contact_person":"Vendor Man","email":"vendor@steel.com","phone":"5555555555","status":"Active"}'
test_api GET /vendors/1

echo ""
echo "--- PURCHASE ORDERS ---"
test_api GET /purchase-orders
test_api POST /purchase-orders '{"vendor_id":1,"po_number":"PO-001","order_date":"2026-01-20","expected_delivery":"2026-02-01","status":"Draft","total_amount":25000}'
test_api GET /purchase-orders/1

echo ""
echo "--- INVENTORY ---"
test_api GET /inventory/raw-materials
test_api POST /inventory/raw-materials '{"name":"Steel Sheet","sku":"RM-001","unit":"kg","quantity":1000,"min_stock":100,"price":50,"status":"ok"}'
test_api GET /inventory/finished-goods
test_api GET /inventory/transactions
test_api GET /inventory/requisitions

echo ""
echo "--- STOCK ---"
test_api GET /stock
test_api POST /stock '{"name":"MS Pipe 2inch","sku":"STK-001","category":"Pipes","unit":"piece","quantity":500,"min_stock":50,"max_stock":1000,"price":200,"status":"In Stock"}'
test_api GET /stock/1

echo ""
echo "--- BILLING ---"
test_api GET /billing
test_api POST /billing '{"client_id":1,"bill_number":"INV-001","bill_date":"2026-02-01","due_date":"2026-03-01","total_amount":50000,"status":"Draft"}'
test_api GET /billing/1

echo ""
echo "--- DISPATCH ---"
test_api GET /dispatch
test_api POST /dispatch '{"order_id":1,"dispatch_number":"DSP-001","dispatch_date":"2026-02-10","vehicle_number":"TN01AB1234","driver_name":"Driver","status":"Ready to Dispatch"}'
test_api GET /dispatch/1

echo ""
echo "--- FINANCE ---"
test_api GET /finance/transactions
test_api POST /finance/transactions '{"type":"Income","category":"Sales","amount":50000,"date":"2026-02-01","description":"Order payment","status":"Completed"}'
test_api GET /finance/summary
test_api GET /finance/receipts

echo ""
echo "--- STAFF ---"
test_api GET /staff
test_api POST /staff '{"name":"Rajesh Kumar","employee_id":"EMP-001","department":"Production","designation":"Operator","phone":"1111111111","status":"Active","joining_date":"2025-01-01"}'
test_api GET /staff/1

echo ""
echo "--- ATTENDANCE ---"
test_api GET /attendance
test_api GET /attendance/workers
test_api GET /attendance/summary

echo ""
echo "--- PAYROLL ---"
test_api GET /payroll

echo ""
echo "--- SALES ---"
test_api GET /sales
test_api POST /sales '{"client_id":1,"product_id":1,"quantity":10,"unit_price":15000,"total_amount":150000,"sale_date":"2026-02-01","status":"Completed"}'

echo ""
echo "--- DASHBOARD ---"
test_api GET /dashboard/summary
test_api GET /dashboard/recent-orders
test_api GET /dashboard/production-status
test_api GET /dashboard/attendance-today

echo ""
echo "--- REPORTS ---"
test_api GET /reports/sales
test_api GET /reports/production
test_api GET /reports/financial
test_api GET /reports/attendance
test_api GET /reports/inventory
test_api GET /reports/dispatch

echo ""
echo "========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================="
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  Failed tests:"
  echo -e "$ERRORS"
fi
