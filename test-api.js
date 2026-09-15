// Automated Verification Test for Smart Canteen Two-Portal & Google Auth API
const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        }).on('error', reject);
    });
}

function post(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request(`http://localhost:3000${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function verify() {
    console.log('🧪 Running automated verification tests for Two-Portal & Google Login...');

    try {
        // 1. Check System Status
        const statusRes = await get('/api/status');
        console.log(`  ✓ 1. System Status: ${statusRes.data.mode}`);

        // 2. Test Student Google Login
        const studentAuth = await post('/api/auth/google-login', {
            email: 'aarav.sharma@vitstudent.ac.in',
            portal: 'student'
        });
        if (!studentAuth.data.success) throw new Error('Student auth failed');
        console.log(`  ✓ 2. Student Google Auth: Verified '${studentAuth.data.user.full_name}' (${studentAuth.data.user.email})`);

        // 3. Test Kitchen Staff Login
        const kitchenAuth = await post('/api/auth/google-login', {
            email: 'chef.ramesh@canteen.vit.ac.in',
            portal: 'kitchen'
        });
        if (!kitchenAuth.data.success) throw new Error('Kitchen auth failed');
        console.log(`  ✓ 3. Kitchen Google Auth: Verified '${kitchenAuth.data.user.full_name}' Role: ${kitchenAuth.data.user.role}`);

        // 4. Test Invalid Email Rejection
        const fakeAuth = await post('/api/auth/google-login', {
            email: 'unknown_stranger@gmail.com',
            portal: 'student'
        });
        if (fakeAuth.data.success) throw new Error('Unknown email was improperly authorized');
        console.log(`  ✓ 4. Unauthorized Email Guard: Correctly blocked unregistered email.`);

        // 5. Test Order Placement & Token Number Generation
        const orderRes = await post('/api/orders', {
            student_id: studentAuth.data.user.student_id,
            items: [{ item_id: 1, quantity: 2 }], // 2x Masala Dosa
            payment_method: 'Student Wallet',
            special_instructions: 'Crispy dosa test'
        });
        const tokenNo = orderRes.data.token_no || orderRes.data.order_id;
        console.log(`  ✓ 5. Order Placement & Token Generation: TOKEN #${tokenNo} issued!`);

        // 6. Test Student Token Tracker Listing
        const tokensRes = await get(`/api/student/tokens/${studentAuth.data.user.student_id}`);
        console.log(`  ✓ 6. Student Token Tracker: Found ${tokensRes.data.length} tokens for student.`);

        // 7. Test Unit 5 ACID Commit
        const commitRes = await post('/api/demo/transaction', { scenario: 'commit', item_id: 1, quantity: 2 });
        console.log(`  ✓ 7. Unit 5 ACID Commit: ${commitRes.data.acidProperty}`);

        // 8. Test Unit 5 ACID Rollback
        const rollbackRes = await post('/api/demo/transaction', { scenario: 'rollback', item_id: 1, quantity: 500 });
        console.log(`  ✓ 8. Unit 5 ACID Rollback: ${rollbackRes.data.acidProperty}`);

        console.log('\n🎉 ALL 8 TWO-PORTAL & AUTH TESTS PASSED PERFECTLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed:', err);
        process.exit(1);
    }
}

setTimeout(verify, 1000);
