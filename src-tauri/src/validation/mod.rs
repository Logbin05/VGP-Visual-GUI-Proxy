pub mod error;
pub mod checker;
pub use checker::{ValidationIssue, Severity, check_compatibility};