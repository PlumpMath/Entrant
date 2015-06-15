var React = require( 'react' );
var ipc = window.require('ipc');
// var Image = window.require('image');


var SplashView = React.createClass({
  render: function() {
    var styles = {
      textAlign: 'center',
    };
    var sectionStyle = {
      margin: '0 auto 2em auto',
      maxWidth: 500,
      textAlign: 'left',
      flexGrow: 1,
      paddingTop: '2em'
    };
    return (
      <div {...this.props} style={styles}>
        <section style={sectionStyle}>
          <h1>KC's Fitness</h1>
          <p>Log into your Fit Entry account to open check-ins.</p>
        </section>
        <section className="welcome-actions">
          {this.props.children}
        </section>
      </div>
    );
  }
});

var Image = React.createClass({
  getInitialState: function() {
    return {
      loaded: false
    };
  },
  componentDidMount: function() {
    var imgSrc = this.props.src;
    var img = new window.Image();
    img.onload = function() {
      this.setState({loaded: true});
    }.bind(this);
    img.src = imgSrc;
  },
  render: function() {
    var styles = this.state.loaded ? {opacity: 1} : {opacity: 0};
    return (
      <img {...this.props} style={styles} />
    );
  }
});

var FlashMessage = React.createClass({
  render: function() {
    return (
      <div className={'flash-message flash-message-'+this.props.type}>
        {this.props.children}
      </div>
    );
  }
});

var CheckInDisplay = React.createClass({
  componentDidMount: function() {
    if (this.props.onClose) {
      setTimeout(this.props.onClose, 5000);
    }
  },
  render: function() {
    return (
      <div className="CheckInDisplay">
        <Image src={this.props.avatarUrl} className="member-avatar" />
        <section>
          <h2>{this.props.member}</h2>
          <span>{this.props.timestamp}</span>
        </section>
      </div>
    );
  }
});

var NumbersDisplay = React.createClass({
  render: function() {
    var numbers = this.props.numbers.map(function(num, i) {
      return (<div key={i}>{num}</div>);
    });
    return (
      <div className="NumbersDisplay">
        {numbers}
      </div>
    );
  }
});

var AuthButton = React.createClass({
  getInitialState: function() {
    return {
      authWindow: null,
      requesting: false
    };
  },
  componentDidMount: function() {
    ipc.on('auth-received', function(token) {
      if (this.props.authed) {
        this.props.authed(token);
      }
      this.setState({requesting: false});
    }.bind(this));

    ipc.on('auth-closed', function() {
      this.setState({requesting: false});
    }.bind(this));
  },
  openAuthWindow: function() {
    ipc.send('request-auth');
    this.setState({requesting: true});
  },
  render: function() {
    return (
      <button
        onClick={this.openAuthWindow}
        disabled={this.state.requesting}>
        Login to Fit Entry
      </button>
    );
  }
});

var Main = React.createClass( {
  getInitialState: function() {
    return {
      pin: [],
      submitting: false,
      errorMessage: null,
      lastCheckIn: null,
      token: null
    };
  },
  clearMessages: function() {
    this.setState({
      errorMessage: null
    });
  },
  displayName: 'Main',
  pinNumberInput: function(e) {
    var pinNumber = String.fromCharCode(e.charCode);

    if (!pinNumber.match(/\d/)) {
      return;
    }

    var sliceFrom = this.state.pin.length >= 4 ?
      this.state.pin.length - 3 : 0;

    var pins = this.state.pin.slice(sliceFrom);
    pins.push(pinNumber);

    if (pins.length === 4) {
      this.setState({
        pin: [],
        submitting: true,
        errorMessage: null
      });

      ipc.send('create-check-in', this.state.token, pins.join(''));
    } else {
      this.setState({pin: pins});
    }
  },
  isAuthed: function() {
    return this.state.token;
  },
  componentDidMount: function() {
    document.onkeypress = this.pinNumberInput;

    ipc.on('created-check-in', function(checkIn) {
      this.clearMessages();
      this.setState({
        submitting: false,
        lastCheckIn: checkIn,
        pin: []
      });
    }.bind(this));

    ipc.on('check-in-failed', function() {
      this.clearMessages();
      this.setState({
        submitting: false,
        errorMessage: "Can't check-in",
        pin: []
      });
    }.bind(this));
  },
  removeCheckIn: function() {
    this.setState({lastCheckIn: null});
  },
  saveToken: function(token) {
    this.setState({token: token});
  },
  render: function() {
    var flashMessage = this.state.errorMessage && (
      <FlashMessage type="error">
        {this.state.errorMessage}
      </FlashMessage>
    );
    var topDisplay;
    if (this.state.lastCheckIn) {
      topDisplay = (
        <CheckInDisplay
        key={this.state.lastCheckIn.id}
        avatarUrl={this.state.lastCheckIn.avatar_url}
        timestamp={this.state.lastCheckIn.checked_in_at}
        member={this.state.lastCheckIn.by}
        onClose={this.removeCheckIn}
        />
      );
    } else {
      topDisplay = (
        <div className="check-in-welcome">
          <h1>Check-in</h1>
          <p>Type in your pin number to check-in.</p>
        </div>
      );
    }

    var routedView;
    if (this.isAuthed()) {
      routedView = (
        <div>
          <section className="check-in-display">
            {topDisplay}
          </section>
          <section className="check-in-input">
            <NumbersDisplay numbers={this.state.pin} />
          </section>
        </div>
      );
    } else {
      routedView = (
        <SplashView className="initial-screen">
          <AuthButton authed={this.saveToken}></AuthButton>
        </SplashView>
      );
    }

    return (
      <div>
        {flashMessage}
        {routedView}
      </div>
    );
  }
} );

module.exports = Main;
