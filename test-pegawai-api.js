const https = require('https');

const testPegawaiAPI = async () => {
  const url = 'http://sikawan.jasatirta2.co.id/V_API2/Apipegawai/get_data_pegawai_for_grc';
  
  console.log('🔄 Testing API Connection...');
  console.log('URL:', url);
  console.log('Method: POST');
  console.log('Header: X-APIKEY');
  console.log('-----------------------------------\n');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-APIKEY': '############',
        'Content-Type': 'application/json'
      },
      // Uncomment jika API memerlukan body
      // body: JSON.stringify({})
    });

    console.log('✅ Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('-----------------------------------\n');

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
      console.log('📦 Response Data (JSON):');
      console.log(JSON.stringify(data, null, 2));
    } else {
      data = await response.text();
      console.log('📦 Response Data (Text):');
      console.log(data);
    }

    console.log('\n-----------------------------------');
    console.log('✅ Connection Test Successful!');
    
    // Tampilkan info tambahan jika data adalah array
    if (Array.isArray(data)) {
      console.log(`📊 Total Records: ${data.length}`);
      if (data.length > 0) {
        console.log('Sample Record (First):', JSON.stringify(data[0], null, 2));
      }
    } else if (data && typeof data === 'object') {
      console.log('📊 Response Keys:', Object.keys(data));
    }

  } catch (error) {
    console.error('❌ Connection Test Failed!');
    console.error('Error:', error.message);
    
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
};

// Jalankan test
testPegawaiAPI();
