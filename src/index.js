import contractABI from "./abi.json";

// 2️⃣ Set your smart contract address 👇
const contractAddress = "0x564B404109F3d358f4B593020a438F27055F3367";

let web3 = new Web3(window.ethereum);

// 3️⃣ Connect to the contract using web3
let contract = new web3.eth.Contract(contractABI, contractAddress);

async function connectWallet() {
  if (window.ethereum) {
    try {
      // 1️⃣ Request Wallet Connection from MetaMask
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setConnected(accounts[0]);
    } catch (err) {
      if (err.code === 4001) {
        // EIP-1193 userRejectedRequest error.
        console.log("Please connect to MetaMask.");
      } else {
        console.error(err);
      }
    }
  } else {
    console.error("No web3 provider detected");
    document.getElementById("connectMessage").innerText =
      "No web3 provider detected. Please install MetaMask.";
  }
}

async function createTweet(content) {
  const accounts = await web3.eth.getAccounts();
  try {
    // 4️⃣ Call the contract createTweet method to create the actual TWEET
    await contract.methods.createTweet(content).send({ from: accounts[0] });
    // 7️⃣ Reload tweets after creating a new tweet
    displayTweets(accounts[0]);
  } catch (error) {
    console.error("User rejected request:", error);
  }
}

async function displayTweets(userAddress) {
  const tweetsContainer = document.getElementById("tweetsContainer");
  tweetsContainer.innerHTML = "";

  try {
    // 5️⃣ Call the function getAllTweets from the smart contract to get all the tweets
    const tempTweets = await contract.methods.getAllTweets(userAddress).call();
    console.log("Fetched tweets:", tempTweets); // Log fetched tweets for debugging

    // Validate if tempTweets is an array
    if (!Array.isArray(tempTweets)) {
      throw new Error("The data retrieved is not an array.");
    }

    // We do this so we can sort the tweets by timestamp
    const tweets = tempTweets.map((tweet) => {
      // Assuming tweet has properties like author, content, timestamp, likes, id
      return { ...tweet };
    });

    tweets.sort((a, b) => b.timestamp - a.timestamp);

    for (let i = 0; i < tweets.length; i++) {
      const tweetElement = document.createElement("div");
      tweetElement.className = "tweet";

      const userIcon = document.createElement("img");
      userIcon.className = "user-icon";
      userIcon.src = `https://avatars.dicebear.com/api/human/${tweets[i].author}.svg`;
      userIcon.alt = "User Icon";

      tweetElement.appendChild(userIcon);

      const tweetInner = document.createElement("div");
      tweetInner.className = "tweet-inner";

      tweetInner.innerHTML += `
          <div class="author">${shortAddress(tweets[i].author)}</div>
          <div class="content">${tweets[i].content}</div>
      `;

      const likeButton = document.createElement("button");
      likeButton.className = "like-button";
      likeButton.innerHTML = `
          <i class="far fa-heart"></i>
          <span class="likes-count">${tweets[i].likes}</span>
      `;
      likeButton.setAttribute("data-id", tweets[i].id);
      likeButton.setAttribute("data-author", tweets[i].author);

      addLikeButtonListener(
        likeButton,
        userAddress,
        tweets[i].id,
        tweets[i].author
      );
      tweetInner.appendChild(likeButton);
      tweetElement.appendChild(tweetInner);

      tweetsContainer.appendChild(tweetElement);
    }
  } catch (error) {
    console.error("Error fetching or displaying tweets:", error);
  }
}

function addLikeButtonListener(likeButton, address, id, author) {
  likeButton.addEventListener("click", async (e) => {
    e.preventDefault();

    e.currentTarget.innerHTML = '<div class="spinner"></div>';
    e.currentTarget.disabled = true;
    try {
      await likeTweet(author, id);
      displayTweets(address);
    } catch (error) {
      console.error("Error liking tweet:", error);
    } finally {
      e.currentTarget.innerHTML = `
          <i class="far fa-heart"></i>
          <span class="likes-count">${
            parseInt(
              e.currentTarget.querySelector(".likes-count").textContent
            ) + 1
          }</span>
      `;
      e.currentTarget.disabled = false;
    }
  });
}

function shortAddress(address, startLength = 6, endLength = 4) {
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

async function likeTweet(author, id) {
  const accounts = await web3.eth.getAccounts();
  try {
    // 8️⃣ Call the likeTweet function from the smart contract
    await contract.methods.likeTweet(author, id).send({ from: accounts[0] });
  } catch (error) {
    console.error("User rejected request:", error);
  }
}

function setConnected(address) {
  document.getElementById("userAddress").innerText =
    "Connected: " + shortAddress(address);
  document.getElementById("connectMessage").style.display = "none";
  document.getElementById("tweetForm").style.display = "block";

  // 6️⃣ Display all tweets after connecting to MetaMask
  displayTweets(address);
}

document
  .getElementById("connectWalletBtn")
  .addEventListener("click", connectWallet);

document.getElementById("tweetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = document.getElementById("tweetContent").value;
  const tweetSubmitButton = document.getElementById("tweetSubmitBtn");
  tweetSubmitButton.innerHTML = '<div class="spinner"></div>';
  tweetSubmitButton.disabled = true;
  try {
    await createTweet(content);
  } catch (error) {
    console.error("Error sending tweet:", error);
  } finally {
    // Restore the original button text
    tweetSubmitButton.innerHTML = "Tweet";
    tweetSubmitButton.disabled = false;
  }
});
