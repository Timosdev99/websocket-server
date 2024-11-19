
const messageEl = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const socket = new WebSocket("ws://localhost:3000");
const clearBtn = document.getElementById("clearBtn");

const log = (text, type = 'normal') => {
    const p = document.createElement('p');
    p.textContent = text;
    p.style.color = type === 'error' ? 'red' : 'black';
    messageEl.appendChild(p);
}

socket.onopen = (event) => {
    log('Socket connected');
    sendBtn.disabled = false;
}

socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        log(`Received: ${JSON.stringify(data)}`);
    } catch (error) {
        log(`Error parsing message: ${error}`, 'error');
    }
}

socket.onclose = (event) => {
    log('Disconnected from socket server');
    sendBtn.disabled = true;
}

socket.onerror = (error) => {
    log(`Socket error: ${error}`, 'error');
}

sendBtn.disabled = true;
sendBtn.addEventListener('click', () => {
    const id = Math.round(Math.random() * 100);
    const data = {
        id,
        name: `${id} timosdev`,
        address: {
            number: Math.round(id),
            street: 'my street'
        },
        profession: 'developer'
    };

    try {
        socket.send(JSON.stringify(data));
        log(`Sent: ${JSON.stringify(data)}`);
    } catch (error) {
        log(`Failed to send message: ${error}`, 'error');
    }
});

const clearContent = () => {
    const messageElement = document.getElementById("message");
    messageElement.innerHTML = "";

    return "Socket connected";
};

clearBtn.addEventListener('click', () => {
    try {
        const clear = clearContent()
        log(clear)
     
    } catch (error) {
        log(`Failed to send message: ${error}`, 'error');
    }
})

