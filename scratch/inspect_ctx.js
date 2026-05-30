const { Context, Api } = require('grammy');

const api = new Api("fake-token");
const ctx = new Context({ update_id: 1 }, api, { username: "fake_bot" });

console.log("ctx.me:", ctx.me);
