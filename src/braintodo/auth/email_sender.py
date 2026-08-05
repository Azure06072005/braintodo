from typing import Protocol


class EmailSender(Protocol): 
    async def send(self, to: str, subject: str, body: str) -> None: ... 

class FakeEmailSender: 
    def __init__(self) -> None: 
        self.sent: list[dict[str, str]] = [] 
    
    async def send(self, to: str, subject: str, body: str) -> None: 
        self.sent.append({"to": to, "subject": subject, "body": body})

class SMTPEmailSender: 
    def __init__(
        self, host: str, port: int, user: str, password: str, from_addr: str
    ) -> None: 
        self._host = host
        self._port = port
        self._user = user
        self._password = password
        self._from_addr = from_addr

    async def send(self, to: str, subject: str, body: str) -> None: 
        from email.message import EmailMessage

        import aiosmtplib

        message = EmailMessage()
        message["From"] = self._from_addr
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)

        await aiosmtplib.send(
            message, 
            hostname=self._host, 
            port=self._port,
            username=self._user,
            password=self._password,
            start_tls=True,
        )