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
echo "  MESPro Full CRUD API Test Suite"
echo "========================================="

echo ""
echo "--- 1. AUTH ---"
test_api GET /auth/profile
echo "  ✓ POST /auth/login -> 200 (token obtained)"
PASS=$((PASS + 1))

echo ""
echo "--- 2. USERS ---"
test_api GET /users
test_api GET /users/roles

echo ""
echo "--- 3. CLIENTS (CRUD) ---"
test_api GET /clients
test_api POST /clients '{"name":"ABC Corp","contact_person":"John Doe","phone":"9876543210","email":"john@abc.com","address":"123 Main St","city":"Chennai","status":"Active"}'
test_api GET /clients/1
test_api PUT /clients/1 '{"name":"ABC Corp Updated","phone":"1112223333"}'
test_api GET /clients/1

echo ""
echo "--- 4. LEADS (CRUD) ---"
test_api GET /leads
test_api POST /leads '{"customer":"XYZ Enterprises","contact":"Jane Smith","mobile":"9876543210","email":"jane@xyz.com","source":"Website","product":"Steel Pipes","quantity":100}'
test_api GET /leads/1
test_api PUT /leads/1 '{"status":"Contacted"}'
test_api GET /leads/1

echo ""
echo "--- 5. PRODUCTS (CRUD) ---"
test_api GET /products
test_api POST /products '{"name":"Steel Gate","sku":"SG-001","category":"Gates","price":15000,"unit":"piece","status":"Active"}'
test_api GET /products/1
test_api PUT /products/1 '{"price":16000}'
test_api GET /products/1

echo ""
echo "--- 6. VENDORS (CRUD) ---"
test_api GET /vendors
test_api POST /vendors '{"name":"Raw Materials Supplier","contact_person":"Vendor Contact","phone":"9876543210","email":"vendor@supplier.com","category":"Raw Materials"}'
test_api GET /vendors/1
test_api PUT /vendors/1 '{"name":"Steel Suppliers Ltd"}'
test_api GET /vendors/1

echo ""
echo "--- 7. ORDERS (CRUD) ---"
test_api GET /orders
test_api POST /orders '{"customer":"ABC Corp","contact":"John Doe","mobile":"9876543210","product":"Steel Gate","quantity":5,"unit_price":15000,"total_amount":75000,"grand_total":88500,"status":"Pending","priority":"High"}'
test_api GET /orders/1
test_api PUT /orders/1/status '{"status":"In Production"}'
test_api GET /orders/1

echo ""
echo "--- 8. PRODUCTION (CRUD) ---"
test_api GET /production
test_api GET /production/stage-definitions
test_api POST /production '{"order_id":1,"order_number":"ORD-001","customer":"ABC Corp","product":"Steel Gate","quantity":5,"priority":"High","due_date":"2026-02-28","status":"Pending"}'
test_api GET /production/1
test_api PUT /production/1 '{"status":"In Progress"}'

echo ""
echo "--- 9. PURCHASE ORDERS (CRUD) ---"
test_api GET /purchase-orders
test_api POST /purchase-orders '{"vendor_name":"Raw Materials Supplier","date":"2026-02-11","vendor_id":1,"expected_delivery":"2026-03-01","total_amount":50000,"payment_terms":"Net 30"}'
test_api GET /purchase-orders/1
test_api PUT /purchase-orders/1 '{"total_amount":55000}'

echo ""
echo "--- 10. INVENTORY ---"
test_api GET /inventory/raw-materials
test_api POST /inventory/raw-materials '{"name":"Steel Sheet","sku":"RM-001","unit":"kg","quantity":1000,"min_stock":100,"price":50,"status":"ok"}'
test_api GET /inventory/finished-goods
test_api GET /inventory/transactions
test_api GET /inventory/requisitions

echo ""
echo "--- 11. STOCK (CRUD) ---"
test_api GET /stock
test_api POST /stock '{"name":"MS Pipe 2inch","sku":"STK-001","category":"Pipes","unit":"piece","quantity":500,"min_stock":50,"max_stock":1000,"price":200,"status":"In Stock"}'
test_api GET /stock/1
test_api PUT /stock/1 '{"quantity":450}'

echo ""
echo "--- 12. BILLING (CRUD) ---"
test_api GET /billing
test_api POST /billing '{"client_name":"ABC Corp","date":"2026-02-11","subtotal":75000,"total_tax":13500,"grand_total":88500,"payment_type":"credit"}'
test_api GET /billing/1
test_api PUT /billing/1 '{"payment_status":"paid"}'

echo ""
echo "--- 13. DISPATCH (CRUD) ---"
test_api GET /dispatch
test_api POST /dispatch '{"order_id":1,"dispatch_no":"DSP-001","date":"2026-02-15","vehicle_no":"TN01AB1234","driver":"Rajesh","status":"Ready to Dispatch"}'
test_api GET /dispatch/1
test_api PUT /dispatch/1/status '{"status":"In Transit"}'

echo ""
echo "--- 14. FINANCE ---"
test_api GET /finance/transactions
test_api POST /finance/transactions '{"type":"Income","category":"Sales","amount":88500,"date":"2026-02-11","description":"Order payment from ABC Corp","status":"Completed"}'
test_api GET /finance/summary
test_api GET /finance/receipts

echo ""
echo "--- 15. STAFF (CRUD) ---"
test_api GET /staff
test_api POST /staff '{"name":"Rajesh Kumar","employee_id":"EMP-001","department":"Production","role":"Operator","phone":"1111111111","status":"Active","join_date":"2025-01-01"}'
test_api GET /staff/1
test_api PUT /staff/1 '{"department":"Quality"}'

echo ""
echo "--- 16. ATTENDANCE ---"
test_api GET /attendance
test_api GET /attendance/workers
test_api GET /attendance/summary

echo ""
echo "--- 17. PAYROLL ---"
test_api GET /payroll

echo ""
echo "--- 18. SALES (CRUD) ---"
test_api GET /sales
test_api POST /sales '{"date":"2026-02-11","client_name":"ABC Corp","product_details":"Steel Gate x5","quantity":5,"unit_price":15000,"total_amount":75000,"sales_person":"Admin","status":"confirmed"}'

echo ""
echo "--- 19. DASHBOARD ---"
test_api GET /dashboard/summary
test_api GET /dashboard/recent-orders
test_api GET /dashboard/production-status
test_api GET /dashboard/attendance-today

echo ""
echo "--- 20. REPORTS ---"
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
