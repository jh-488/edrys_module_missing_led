const appContainer = document.querySelector(".app");

const title = document.querySelector(".title");

const homeContainer = document.querySelector(".home_container");
const startChallenge = document.getElementById("start_challenge");
const serverNotConnectedError = document.getElementById("server_not_connected");

const waiting_container = document.querySelector(".waiting_container");
const InternalServerError = document.getElementById("internal_server_error");

const challengeContainer = document.querySelector(".challenge_container");
const countdownElement = document.querySelector(".countdown");
const timerCircle = document.querySelector(".timer-circle");
const circumference = parseFloat(
  getComputedStyle(timerCircle).getPropertyValue("stroke-dasharray")
);

const feedbackContainer = document.querySelector(".feedback_container");
const feedbackMessage = document.getElementById("feedback_message");
const tryAgainButton = document.getElementById("try_again");

let timerStart;

Edrys.onReady(() => {
  console.log("Module Missing LED is loaded!");

  timerStart = Edrys.module.config.timer ? Edrys.module.config.timer : 5;
});

const changeTab = (showContainers, hideContainers, displayStyle) => {
  hideContainers.forEach(container => container.style.display = 'none');
  showContainers.forEach(container => container.style.display = displayStyle);
};

// connect to the websocket server
var socket = new WebSocket(Edrys?.module?.serverURL || "ws://localhost:8080");

// send a message to the server to start the challenge
startChallenge.onclick = () => {
  Edrys.sendMessage("reandomize-leds", "Randomize LEDs!");

  changeTab([waiting_container], [homeContainer], "block");
};


socket.onmessage = (event) => {
  var data = JSON.parse(event.data);

  if (data.error) {
    Edrys.sendMessage("server-error", "Server error!");
  } else if (data.ledsRandomized) {
    Edrys.sendMessage("leds-randomized", "LEDs randomized!");
  }
};

let time;
let timerInterval;

const updateCountdown = () => {
  const minutes = Math.floor(time / 60);
  let seconds = time % 60;

  seconds = seconds < 10 ? "0" + seconds : seconds;

  countdownElement.textContent = `${minutes}:${seconds}`;

  // Calculate the percentage of time remaining
  const percentage = (time / (timerStart * 60)) * 100;
  const dashOffset = circumference * (1 - percentage / 100);

  // Update the stroke dash offset to animate the circle
  timerCircle.style.strokeDashoffset = dashOffset;

  // Change the color of the timer circle if remaining time is under 20%
  if (percentage < 20) {
    timerCircle.style.stroke = "#ea3943";
  } else {
    timerCircle.style.stroke = "#4ca2ff";
  }

  if (time < 0) {
    clearInterval(timerInterval);
    time = timerStart * 60;
    updateCountdown();

    Edrys.sendMessage("timer-ended", "Timer ended!");

    appContainer.classList.remove("green-bg");
    appContainer.classList.add("red-bg");
    setFeedbackMessage("Time's up! Challenge failed!");

    return;
  }

  time--;
};

const stopTimer = () => {
  clearInterval(timerInterval);
  time = timerStart * 60;
  updateCountdown();
};

// Handle the timer start/pause/continue events
const startTimer = () => {
  time = timerStart * 60;
  updateCountdown();
  timerInterval = setInterval(updateCountdown, 1000);
  Edrys.sendMessage("timer-started", "Timer started!");
};

const pauseTimer = () => {
  clearInterval(timerInterval);
};

const continueTimer = () => {
  timerInterval = setInterval(updateCountdown, 1000);
};

// Set the feedback message and show the feedback container
const setFeedbackMessage = (message) => {
  feedbackMessage.textContent = message;
  changeTab([feedbackContainer], [challengeContainer, title], "flex");
};

// Handle received messages from the code editor module
Edrys.onMessage(({ from, subject, body, module }) => {
  if (subject === "challenge-solved") {
    // Calculate the time needed to solve the challenge
    elapsedTimeInSeconds = timerStart * 60 - time;
    const minutes = Math.floor(elapsedTimeInSeconds / 60);
    const seconds = elapsedTimeInSeconds % 60;

    stopTimer();

    appContainer.classList.remove("red-bg");
    appContainer.classList.add("green-bg");
    
    setFeedbackMessage(
      minutes > 0
        ? `Congrats! Challenge solved in ${minutes} minutes and ${seconds} seconds!`
        : `Congrats! Challenge solved in ${seconds} seconds!`
    );
  } else if (subject === "pause-timer") {
    pauseTimer();
  } else if (subject === "continue-timer") {
    continueTimer();
  }
}, (promiscuous = true));

Edrys.onMessage(({ from, subject, body }) => {
  if (subject === "reandomize-leds") {
    if (Edrys.role === "station") {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        serverNotConnectedError.style.display = "block";
      } else {
        socket.send(
          JSON.stringify({
            challengeId: "randomize-leds",
            code: "",
          })
        );
      }
    }
  } else if (subject === "leds-randomized") {
    changeTab([challengeContainer], [waiting_container], "block");
    startTimer();
  } else if (subject === "server-error") {
    InternalServerError.style.display = "block";
    InternalServerError.innerHTML = data.error;
  }
});


tryAgainButton.onclick = () => {
    title.style.display = "block";
    appContainer.classList.remove("red-bg");
    appContainer.classList.remove("green-bg");
    changeTab([homeContainer], [feedbackContainer], "block");

    Edrys.sendMessage("timer-ended", "Timer ended!");
};