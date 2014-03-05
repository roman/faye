Faye.RPC = {

  rpcCall: function(channel, data) {
    var self = this,
        result = new Faye.Publication();
    this.connect(function() {
      var msgId = this._generateMessageId(),
          replyChannel = "/" + this._clientId + "/rpc" + channel,
          req = { "msgId": msgId, "replyChannel": replyChannel, "payload": data };
      this.subscribe(replyChannel, function(resp) {
          if (resp.msgId === msgId) {
             if (!resp.successful && resp.payload) {
               result.setDeferredStatus('failed', resp.payload);
             }
             else if (resp.successful && resp.payload) {
               result.setDeferredStatus('succeeded', resp.payload);
             }
             else {
               result.setDeferredStatus('failed', "Invalid RPC response: " + resp);
             }
          }
          self.unsubscribe(replyChannel);
        });
      this.publish(channel, req);
    }, this);
    return result;
  },

  rpcEndpoint: function(channel, callback, context) {
    var self = this;
    this.subscribe(channel, function(req) {

      function handleArray(result) {
        var resp = { "successful": result[0], "payload": result[1], "msgId": req.msgId };
        self.publish(req.replyChannel, resp);
      }

      function handlePromise(result) {
        result.then(
          function(payload) {
            handleArray([true, payload]);
          },
          function(err) {
            handleArray([false, err]);
          });
      }

      var result0 = callback.call(context, req.payload);
      if (result0.then !== undefined) {
        handlePromise(result0);
      } else if (result0 instanceof Array) {
        handleArray(result0);
      } else {
        throw("Invalid RPC result, must be an Array or Deferrable");
      }
    });
  }

};
