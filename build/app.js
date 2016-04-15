"use strict";

(function () {
  if (!window.addEventListener) return; // Check for IE9+

  var escapeElement = document.createElement("textarea");
  var preview = INSTALL_ID === "preview";
  var options = INSTALL_OPTIONS;
  var element = void 0;

  function esc() {
    var content = arguments.length <= 0 || arguments[0] === undefined ? "" : arguments[0];

    escapeElement.textContent = content;

    return escapeElement.innerHTML;
  }

  function submitConstantContact(options, email, cb) {
    if (!options.form || !options.form.listId) return cb(false);

    var xhr = new XMLHttpRequest();

    var body = {
      email: email,
      ca: options.form.campaignActivity,
      list: options.form.listId
    };

    xhr.open("POST", "https://visitor2.constantcontact.com/api/signup");
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = function () {
      cb(xhr && xhr.status < 400);
    };

    xhr.send(JSON.stringify(body));
  }

  function submitFormspree(options, email, cb) {
    var url = "https://formspree.io/" + options.userEmail;
    var xhr = new XMLHttpRequest();
    var params = "email=" + encodeURIComponent(email);

    xhr.open("POST", url);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = function () {
      var jsonResponse = {};

      if (xhr.status < 400) {
        try {
          jsonResponse = JSON.parse(xhr.response);
        } catch (e) {}

        if (jsonResponse && jsonResponse.success === "confirmation email sent") {
          cb("Formspree has sent an email to " + options.email + " for verification.");
        } else {
          cb(true);
        }
      } else {
        cb(false);
      }
    };

    xhr.send(params);
  }

  function submitMailchimp(options, email, cb) {
    var cbCode = "eagerFormCallback" + Math.floor(Math.random() * 100000000000000);

    window[cbCode] = function (resp) {
      cb(resp && resp.result === "success");

      delete window[cbCode];
    };

    var src = options.list;

    if (!src) return cb(false);

    src = src.replace("http", "https");
    src = src.replace(/list-manage[0-9]+\.com/, "list-manage.com");
    src = src.replace("?", "/post-json?");
    src = src + "&EMAIL=" + encodeURIComponent(email);
    src = src + "&c=" + cbCode;

    var script = Object.assign(document.createElement("script"), { src: src });

    document.head.appendChild(script);
  }

  function delegateEmailSubmit(options, email, callback) {
    if (options.signupDestination === "email" && options.userEmail) {
      submitFormspree(options, email, callback);
    } else if (options.signupDestination === "service") {
      if (options.account.service === "mailchimp") {
        submitMailchimp(options, email, callback);
      } else if (options.account.service === "constant-contact") {
        submitConstantContact(options, email, callback);
      }
    }
  }

  function hide(event) {
    if (event && event.target !== this) return;

    element.setAttribute("data-visibility", "hidden");
    document.body.style.overflow = "";
  }

  var submitHandlers = {
    signup: function signup(event) {
      event.preventDefault();
      element.setAttribute("data-form", "submitting");

      var email = event.target.querySelector("input[name='_replyto']").value;

      delegateEmailSubmit(options, email, function (ok) {
        element.setAttribute("data-form", "submitted");
        options.goal = "signupSuccess";

        if (ok) {
          setTimeout(hide, 3000);
        } else {
          options.signupSuccessTitle = "Whoops";
          options.signupSuccessText = "Something didn’t work. Please try again.";
        }

        updateElement();
      });
    },
    cta: function cta(event) {
      event.preventDefault();

      if (preview) {
        window.location.reload();
      } else {
        window.location = options.ctaLinkAddress;
      }
    },
    announcement: function announcement(event) {
      event.preventDefault();

      element.setAttribute("data-visibility", "hidden");
    }
  };

  var renderers = {
    announcement: function announcement() {
      return "\n        <eager-dialog-content-title>" + esc(options.announcementTitle || "Announcement") + "</eager-dialog-content-title>\n        " + esc(options.announcementText || "Sale! Everything is 75% off this entire week.") + "\n\n        <form>\n          <input type=\"submit\" class=\"submit-button\" value=\"" + esc(options.announcementButtonText || "Got it!") + "\">\n        </form>\n      ";
    },
    cta: function cta() {
      return "\n        <eager-dialog-content-title>" + esc(options.ctaTitle || "New products!") + "</eager-dialog-content-title>\n\n        " + esc(options.ctaText || "We just launched an amazing new product!") + "\n\n        <form>\n          <input type=\"submit\" class=\"submit-button\" value=\"" + esc(options.ctaButtonText || "Take me there!") + "\">\n        </form>\n      ";
    },
    signup: function signup() {
      return "\n        <eager-dialog-content-title>" + esc(options.signupTitle || "Sign up") + "</eager-dialog-content-title>\n        " + (options.signupText || "Join our mailing list to be the first to know what we’re up to!") + "\n\n        <form>\n          <input\n            class=\"input-email\"\n            name=\"_replyto\"\n            placeholder=\"" + esc(options.signupInputPlaceholder || "Email address") + "\"\n            required\n            type=\"email\" />\n          <input class=\"submit-button\" type=\"submit\" value=\"" + esc(options.signupButtonText || "Sign up!") + "\">\n        </form>\n      ";
    },
    signupSuccess: function signupSuccess() {
      return "\n        <eager-dialog-content-title>" + esc(options.signupSuccessTitle || "Thanks for signing up!") + "</eager-dialog-content-title>\n        " + esc(options.signupSuccessText || "You'll be kept up to date with our newsletter.") + "\n      ";
    }
  };

  function updateElement() {
    try {
      localStorage.eagerCoverMessageShown = JSON.stringify(options);
    } catch (e) {}

    element = Eager.createElement({
      selector: "body",
      method: "append"
    }, element);

    element.classList.add("eager-cover-message");
    element.setAttribute("data-visibility", "visible");
    element.setAttribute("data-goal", options.goal);

    document.body.style.overflow = "hidden";

    var children = renderers[options.goal]();

    element.innerHTML = "\n      <eager-backdrop></eager-backdrop>\n\n      <eager-dialog>\n        <eager-dialog-content>\n          <eager-dialog-close-button></eager-dialog-close-button>\n\n          <eager-dialog-content-text>\n            " + children + "\n          </eager-dialog-content-text>\n        </eager-dialog-content>\n      </eager-dialog>\n    ";

    element.querySelector("form").addEventListener("submit", submitHandlers[options.goal]);

    element.querySelector("eager-dialog").addEventListener("click", hide);
    element.querySelector("eager-dialog-close-button").addEventListener("click", hide);
    element.querySelector(".submit-button").style.backgroundColor = options.color;
  }

  function bootstrap() {
    var alreadyShown = localStorage.eagerCoverMessageShown === JSON.stringify(options);

    if (alreadyShown && !preview) return;

    updateElement();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

  INSTALL_SCOPE = {
    setOptions: function setOptions(nextOptions) {
      options = nextOptions;

      updateElement();
    }
  };
})();