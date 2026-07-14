use super::metrics::TestResult;
use std::net::Ipv4Addr;
use std::time::Instant;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
};

pub async fn test_connect(
    proxy_addr: &str,
    target_host: &str,
    target_port: u16,
    username: Option<&str>,
    password: Option<&str>,
) -> TestResult {
    let total_start = Instant::now();

    let connect_start = Instant::now();
    let mut stream = match TcpStream::connect(proxy_addr).await {
        Ok(s) => s,
        Err(e) => return TestResult::failure(format!("connect failed: {}", e)),
    };

    let connect_ms = connect_start.elapsed().as_millis() as u32;
    let handshake_start = Instant::now();

    let has_auth = username.is_some() && password.is_some();
    let greeting: &[u8] = if has_auth {
        &[0x05, 0x01, 0x02]
    } else {
        &[0x05, 0x01, 0x00]
    };

    if let Err(e) = stream.write_all(greeting).await {
        return TestResult::failure(format!("handshake write failed: {}", e));
    }

    let mut response = [0u8; 2];
    if let Err(e) = stream.read_exact(&mut response).await {
        return TestResult::failure(format!("handshake read failed: {}", e));
    }

    let excepted_method = if has_auth { 0x02 } else { 0x00 };
    if response[0] != 0x05 || response[1] != excepted_method {
        return TestResult::failure(format!(
            "proxy rejected no-auth method (got version={}, method={})",
            response[0], response[1]
        ));
    }

    if has_auth {
        if let Err(e) = send_auth(&mut stream, username.unwrap(), password.unwrap()).await {
            return TestResult::failure(e);
        }
    }

    let handshake_ms = handshake_start.elapsed().as_millis() as u32;
    let connect_req_start = Instant::now();
    if let Err(e) = send_connect_request(&mut stream, target_host, target_port).await {
        return TestResult::failure(e);
    }
    let _connect_req_start = connect_req_start.elapsed().as_millis() as u32;
    let total_ms = total_start.elapsed().as_millis() as u32;

    TestResult {
        success: true,
        connect_ms,
        handshake_ms,
        total_ms,
        error: None,
    }
}

async fn send_connect_request(
    stream: &mut TcpStream,
    target_host: &str,
    target_port: u16,
) -> Result<(), String> {
    let mut request = vec![0x05, 0x01, 0x00];

    if let Ok(ip) = target_host.parse::<Ipv4Addr>() {
        request.push(0x01);
        request.extend_from_slice(&ip.octets());
    } else {
        let host_bytes = target_host.as_bytes();
        if host_bytes.len() > 255 {
            return Err("target host too long".to_string());
        }
        request.push(0x03);
        request.push(host_bytes.len() as u8);
        request.extend_from_slice(host_bytes);
    }

    request.extend_from_slice(&target_port.to_be_bytes());

    stream
        .write_all(&request)
        .await
        .map_err(|e| format!("connect request write failed: {}", e))?;

    let mut response = [0u8; 10];
    stream
        .read_exact(&mut response)
        .await
        .map_err(|e| format!("connect response read failed: {}", e))?;

    if response[1] != 0x00 {
        return Err(format!("proxy CONNECT failed with code {}", response[1]));
    }

    Ok(())
}

async fn send_auth(stream: &mut TcpStream, username: &str, password: &str) -> Result<(), String> {
    let user_bytes = username.as_bytes();
    let pass_bytes = password.as_bytes();

    if user_bytes.len() > 255 || pass_bytes.len() > 255 {
        return Err("username or password too long".to_string());
    }

    let mut request = vec![0x01];
    request.push(user_bytes.len() as u8);
    request.extend_from_slice(user_bytes);
    request.push(pass_bytes.len() as u8);
    request.extend_from_slice(pass_bytes);

    stream
        .write_all(&request)
        .await
        .map_err(|e| format!("auth write failed: {}", e))?;

    let mut response = [0u8; 2];
    stream
        .read_exact(&mut response)
        .await
        .map_err(|e| format!("auth read failed: {}", e))?;

    if response[1] != 0x00 {
        return Err("authentication rejected".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn full_flow_succeeds_with_valid_server() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();

            let mut greeting = [0u8; 3];
            socket.read_exact(&mut greeting).await.unwrap();
            socket.write_all(&[0x05, 0x00]).await.unwrap();

            let mut head = [0u8; 5];
            socket.read_exact(&mut head).await.unwrap();
            let domain_len = head[4] as usize;
            let mut rest = vec![0u8; domain_len + 2];
            socket.read_exact(&mut rest).await.unwrap();
            socket
                .write_all(&[0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0])
                .await
                .unwrap();
        });

        let result = test_connect(&addr.to_string(), "example.com", 80, None, None).await;
        println!("{:#?}", result);
        assert!(result.success, "full flow must pass: {:?}", result.error);
    }

    #[tokio::test]
    async fn fails_with_non_socks_server() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut greeting = [0u8; 3];
            let _ = socket.read_exact(&mut greeting).await;
            socket.write_all(&[0xFF, 0xFF]).await.unwrap();
        });

        let result = test_connect(&addr.to_string(), "example.com", 80, None, None).await;
        assert!(!result.success, "must fail on non-SOCKS server");
    }

    #[tokio::test]
    async fn auth_flow_succeeds() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();

            let mut greeting = [0u8; 3];
            socket.read_exact(&mut greeting).await.unwrap();
            socket.write_all(&[0x05, 0x02]).await.unwrap();

            let mut auth_head = [0u8; 2];
            socket.read_exact(&mut auth_head).await.unwrap();
            let user_len = auth_head[1] as usize;
            let mut user = vec![0u8; user_len];
            socket.read_exact(&mut user).await.unwrap();
            let mut plen = [0u8; 1];
            socket.read_exact(&mut plen).await.unwrap();
            let mut pass = vec![0u8; plen[0] as usize];
            socket.read_exact(&mut pass).await.unwrap();
            socket.write_all(&[0x01, 0x00]).await.unwrap();

            let mut head = [0u8; 5];
            socket.read_exact(&mut head).await.unwrap();
            let domain_len = head[4] as usize;
            let mut rest = vec![0u8; domain_len + 2];
            socket.read_exact(&mut rest).await.unwrap();
            socket
                .write_all(&[0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0])
                .await
                .unwrap();
        });

        let result = test_connect(
            &addr.to_string(),
            "example.com",
            80,
            Some("admin"),
            Some("secret"),
        )
        .await;
        println!("{:#?}", result);
        assert!(result.success, "auth flow must pass: {:?}", result.error);
    }
    
    #[tokio::test]
    async fn connect_with_ip_target() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();

            let mut greeting = [0u8; 3];
            socket.read_exact(&mut greeting).await.unwrap();
            socket.write_all(&[0x05, 0x00]).await.unwrap();

            let mut req = [0u8; 10];
            socket.read_exact(&mut req).await.unwrap();
            assert_eq!(req[3], 0x01, "клиент должен слать тип 0x01 для IP");

            socket
                .write_all(&[0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0])
                .await
                .unwrap();
        });

        let result = test_connect(&addr.to_string(), "93.184.216.34", 80, None, None).await;
        println!("{:#?}", result);
        assert!(result.success, "IP target must work: {:?}", result.error);
    }
}
