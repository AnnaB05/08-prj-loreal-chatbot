/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Start conversation with system message that guides the assistant
const conversation = [
  {
    role: "system",
    content: `You are a virtual beauty assistant for L'Oréal. Your purpose is to help users with questions specifically about L'Oréal products, skincare and haircare routines, makeup recommendations, product usage tips, and brand information. Maintain a professional, friendly, and informative tone. Always prioritize accuracy, product expertise, and brand consistency.

Only provide answers related to L'Oréal and its official offerings. If a question is not related to L'Oréal products, routines, or beauty advice connected to the brand, politely decline to answer and redirect the user to topics you can assist with.`,
  },
];

//cloudflare worker
const workerUrl = "https://loreal-worker.aebake03.workers.dev/";

// Replace direct textContent with an assistant message added to conversation
const initialGreeting = "👋 Hello! How can I help you today?";
// Add greeting to conversation history (assistant role) so it's sent on first API call
conversation.push({ role: "assistant", content: initialGreeting });
// Render greeting in the chat window using the helper (preserves formatting)
appendMessage("ai", initialGreeting);

/* Helper: append a message element to the chat window as a "bubble"
   - role: "user" or "ai"
   - text: message content
*/
function appendMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  // Use textContent to preserve newlines; CSS white-space: pre-line renders them
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show the user's latest question above the chat responses.
   This element is updated on every submit (replaces previous content). */
function showLatestQuestion(text) {
  const latest = document.getElementById("latestQuestion");
  if (!latest) return;
  latest.textContent = `Your question: ${text}`;
  latest.classList.remove("visually-hidden");
}

/* Call OpenAI's chat completions endpoint using fetch and async/await.
   - Uses global OPENAI_API_KEY from secrets.js (replace with your key).
   - Sends the conversation (messages) array and model "gpt-4o".
*/
async function callOpenAI(messages) {
  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    // For chat, the assistant text is at data.choices[0].message.content
    const assistantText = data.choices?.[0]?.message?.content;
    return assistantText;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userText = userInput.value.trim();
  if (!userText) return;

  // show latest question (replaces previous)
  showLatestQuestion(userText);

  // Append user bubble to the conversation area (right aligned)
  conversation.push({ role: "user", content: userText });
  appendMessage("user", userText);

  // Show loading indicator (assistant bubble)
  const loading = document.createElement("div");
  loading.className = "msg ai";
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "bubble";
  loadingBubble.textContent = "Assistant: ...typing...";
  loading.appendChild(loadingBubble);
  chatWindow.appendChild(loading);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  userInput.value = "";
  userInput.focus();

  try {
    const assistantReply = await callOpenAI(conversation);
    loading.remove();

    if (assistantReply) {
      conversation.push({ role: "assistant", content: assistantReply });
      appendMessage("ai", assistantReply);
    } else {
      appendMessage("ai", "Sorry — no response from the assistant.");
    }
  } catch (err) {
    loading.remove();
    appendMessage(
      "ai",
      "Error: Unable to get a response. Check console for details."
    );
  }
});

// Logo load checker + fallback
(function verifyLogo() {
  const logo = document.getElementById("brandLogo");
  if (!logo) return;

  // Hide until we confirm the image loads to avoid broken-image icon
  logo.style.visibility = "hidden";

  const tryPaths = [
    logo.src,
    "assets/loreal-logo.png",
    "./assets/loreal-logo.png",
  ];
  let attempt = 0;

  function tryLoad(path) {
    const img = new Image();
    img.onload = () => {
      // success: set the visible src and show it
      logo.src = path;
      logo.style.visibility = "";
    };
    img.onerror = () => {
      attempt += 1;
      if (attempt < tryPaths.length) {
        tryLoad(tryPaths[attempt]);
      } else {
        console.warn("Logo not found at any tested path:", tryPaths);
        // Fallback: replace the img with a simple inline SVG text so branding remains visible
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.setAttribute("viewBox", "0 0 240 48");
        svg.setAttribute("class", "brand-logo-fallback");
        svg.innerHTML = `<text x="0" y="36" font-family="Montserrat, Arial, Helvetica, sans-serif" font-size="34" fill="#000">L'ORÉAL</text>`;
        logo.replaceWith(svg);
      }
    };
    img.src = path;
  }

  tryLoad(tryPaths[attempt]);
})();
