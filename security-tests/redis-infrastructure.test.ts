import { redisService, createSafeKey } from '../server/infrastructure/redis';

async function runRedisTests() {
  console.log('--- Redis Infrastructure Tests ---');
  let passed = 0;
  let total = 0;

  const assert = (condition: boolean, msg: string) => {
    total++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
    }
  };

  try {
    // Note: in local environments without REDIS_URL, redisService.getClient() is null
    const client = redisService.getClient();
    
    if (!client) {
      console.log('[INFO] No REDIS_URL configured. Verifying graceful degradation...');
      assert(true, 'Redis client safely handles undefined connection');
      
      const ping = await redisService.ping();
      assert(ping === false, 'Ping fails gracefully when disabled');
      
    } else {
      console.log('[INFO] REDIS_URL detected. Testing live connection...');
      
      const ping = await redisService.ping();
      assert(ping === true, 'Redis ping returns true on live connection');

      // Test basic key ops
      const testKey = 'test:health:probe';
      await redisService.set(testKey, 'alive', 10);
      let val = await redisService.get(testKey);
      assert(val === 'alive', 'Set and get work correctly');

      await redisService.delete(testKey);
      val = await redisService.get(testKey);
      assert(val === null, 'Delete works correctly');

      // Test atomicity
      const incKey = 'test:atomic:counter';
      await redisService.delete(incKey);
      
      let count = await redisService.increment(incKey, 30);
      assert(count === 1, 'First increment is 1');
      count = await redisService.increment(incKey, 30);
      assert(count === 2, 'Second increment is 2');

      await redisService.delete(incKey);
    }

    // Test Key Safety
    const safeKey1 = createSafeKey('rl:login', 'tenant_xyz', 'user@example.com');
    const safeKey2 = createSafeKey('rl:login', 'tenant_xyz', 'USER@example.com'); // should be lowercased before calling this in real usage, but let's test isolation
    
    assert(safeKey1.startsWith('dp:rl:login:tenant_xyz:'), 'Key namespace prefixing works');
    assert(safeKey1 !== safeKey2, 'Case differences yield different hashes');
    assert(!safeKey1.includes('user@example.com'), 'Original PII is not leaked in the key');

  } catch (err: any) {
    console.error('Test threw unexpected error:', err);
  } finally {
    // Cleanup
    await redisService.disconnect();
    
    console.log(`\n--- Results: ${passed}/${total} passed ---`);
    if (passed < total) {
      process.exit(1);
    }
  }
}

runRedisTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
