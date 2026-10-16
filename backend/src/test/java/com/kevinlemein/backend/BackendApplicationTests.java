package com.kevinlemein.backend;

import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

// Runs against the shared Testcontainers PostgreSQL from IntegrationTestBase.
// Previously failed without a "docker" profile + real DB env vars, because the
// base application.properties defines no datasource.
class BackendApplicationTests extends IntegrationTestBase {

	@Test
	void contextLoads() {
	}

}
