use serde::Serialize;

use crate::config::model::TimeoutsConfig;

#[derive(Debug, Clone, Serialize)]
pub struct TestResult {
    pub success: bool,
    pub connect_ms: u32,
    pub handshake_ms: u32,
    pub total_ms: u32,
    pub error: Option<String>,
}

impl TestResult {
    pub fn failure(error: String) -> TestResult {
        TestResult {
            success: false,
            connect_ms: 0,
            handshake_ms: 0,
            total_ms: 0,
            error: Some(error),
        }
    }
}

impl Default for TimeoutsConfig {
    fn default() -> Self {
        TimeoutsConfig {
            connect_sec: 10,
            read_sec: 10,
            write_sec: 10,
            idle_sec: 30,
            handshake_sec: Some(5),
        }
    }
}
