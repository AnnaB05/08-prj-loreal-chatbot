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

// Replace direct textContent with an assistant message added to conversation
const initialGreeting = "👋 Hello! How can I help you today?";
// Add greeting to conversation history (assistant role) so it's sent on first API call
conversation.push({ role: "assistant", content: initialGreeting });
// Render greeting in the chat window using the helper (preserves formatting)
appendMessage("ai", initialGreeting);

/* Helper: append a message element to the chat window
   We use textContent so that newlines are preserved. The container has CSS white-space: pre-line. */
function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  // Prefix label for clarity (students can remove if undesired)
  const label = role === "user" ? "You: " : "Assistant: ";
  div.textContent = `${label}${text}`;
  chatWindow.appendChild(div);
  // Keep the latest message in view
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Call OpenAI's chat completions endpoint using fetch and async/await.
   - Uses global OPENAI_API_KEY from secrets.js (replace with your key).
   - Sends the conversation (messages) array and model "gpt-4o".
*/
async function callOpenAI(messages) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`, // OPENAI_API_KEY comes from secrets.js
      },
      body: JSON.stringify({
        model: "gpt-4o",
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

  // Append user message to conversation and UI
  conversation.push({ role: "user", content: userText });
  appendMessage("user", userText);

  // Show loading indicator
  const loading = document.createElement("div");
  loading.className = "msg ai";
  loading.textContent = "Assistant: ...typing...";
  chatWindow.appendChild(loading);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Clear input for convenience
  userInput.value = "";
  userInput.focus();

  try {
    const assistantReply = await callOpenAI(conversation);
    // Remove loading indicator
    loading.remove();

    if (assistantReply) {
      // Add assistant message to conversation for future context
      conversation.push({ role: "assistant", content: assistantReply });
      // Render assistant reply (textContent preserves newlines; CSS pre-line displays them)
      appendMessage("ai", assistantReply);
    } else {
      appendMessage("ai", "Sorry — no response from the assistant.");
    }
  } catch (err) {
    // Replace loading with an error message for the user
    loading.remove();
    appendMessage(
      "ai",
      "Error: Unable to get a response. Check console for details."
    );
  }
});
