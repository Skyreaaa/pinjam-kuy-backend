// Test semua endpoint GET dan POST utama
const BASE_URL = 'https://pinjam-kuy-backend-production.up.railway.app';

async function testEndpoints() {
    console.log('🧪 Testing PinjamKuy API Endpoints\n');
    console.log('='.repeat(70));

    // Test 1: GET /api/books (Public endpoint)
    console.log('\n1. GET /api/books (Get all books)');
    try {
        const res = await fetch(`${BASE_URL}/api/books`);
        const data = await res.json();
        console.log(`✅ Status: ${res.status}`);
        console.log(`   Books found: ${Array.isArray(data) ? data.length : 'N/A'}`);
        if (Array.isArray(data) && data.length > 0) {
            console.log(`   Sample: ${data[0].title}`);
        }
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }

    // Test 2: Login (POST /auth/login)
    console.log('\n2. POST /auth/login (Admin login)');
    let adminToken = '';
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npm: '123456', password: 'admin' })
        });
        const data = await res.json();
        console.log(`✅ Status: ${res.status}`);
        if (data.token) {
            adminToken = data.token;
            console.log(`   Token received: ${adminToken.substring(0, 20)}...`);
            console.log(`   Role: ${data.role}`);
        } else {
            console.log(`   Response: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }

    // Test 3: GET /api/admin/stats (Admin only)
    console.log('\n3. GET /api/admin/stats (Dashboard statistics)');
    try {
        const res = await fetch(`${BASE_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        console.log(`✅ Status: ${res.status}`);
        if (data.totalUsers !== undefined) {
            console.log(`   Total Users: ${data.totalUsers}`);
            console.log(`   Total Books: ${data.totalBooks}`);
            console.log(`   Total Loans: ${data.totalLoans}`);
        } else {
            console.log(`   Response: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }

    // Test 4: GET /api/admin/users (User management)
    console.log('\n4. GET /api/admin/users (List all users)');
    try {
        const res = await fetch(`${BASE_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        console.log(`✅ Status: ${res.status}`);
        console.log(`   Users found: ${Array.isArray(data) ? data.length : 'N/A'}`);
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }

    // Test 5: GET /api/admin/loans/active
    console.log('\n5. GET /api/admin/loans/active (Active loans)');
    try {
        const res = await fetch(`${BASE_URL}/api/admin/loans/active`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        console.log(`✅ Status: ${res.status}`);
        console.log(`   Active loans: ${Array.isArray(data) ? data.length : 'N/A'}`);
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test complete!\n');
}

testEndpoints().catch(console.error);
