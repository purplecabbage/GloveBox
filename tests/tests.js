function Tests() { 
    this.bounceTimeout = 3000;
    this.scrollTimeout = 1000;
//    this.containerHeight = document.getElementById()
};
Tests.prototype = {
    run:function() {
        for (var t in this) {
            if (t.indexOf('Test') > -1) {
                this[t]();
            }
        }
    },
    Test:function() {
        var self = this;
        module('Initialization', {
           setup:function() {
  //             glovebox = new GloveBox("masterList");
           },
           teardown:function(){
//               glovebox = null;
           }
        });
        test('We can instantiate glovebox', function() {
            expect(4);
            var glovebox1 = new GloveBox("masterList");
            ok(typeof glovebox1 == 'object', 'GloveBox can be instantiated via ID string');
            var glovebox2 = new GloveBox(document.getElementById("masterList"));
            ok(typeof glovebox2 == 'object', 'GloveBox can be instantiated via element');
            try {
                var glovebox3 = new GloveBox('somerandomstring');
            } catch(e) {
                ok(true, 'Expected exception raised when wrong ID string provided on construction' + e.type);
                equals(e.message, "Cannot read property 'parentNode' of null");
            }
        });
        
        module('Scrolling', {
            setup:function() {
                glovebox = new GloveBox("masterList");
            },
            teardown:function() {
                glovebox = null;
            }
        });
        test('Vertical scrolling test in range', function() {
            QUnit.stop();
            expect(1);
            glovebox.y = -100;
            glovebox.finishScrolling();
            setTimeout(function() {
                equals(glovebox.y, -100, 'Y setter works');
                start();
            }, self.scrollTimeout);
        });
        test('Vertical scrolling test out of range', function() {
            QUnit.stop();
            expect(2);
            glovebox.y = 100;
            glovebox.finishScrolling();
            setTimeout(function() {
                equals(glovebox.y, 0, 'Y setter works');                
                glovebox.y = -10000;
                glovebox.finishScrolling();
                setTimeout(function() {
                    equals(glovebox.y, -800); // refactor these properties.
                    start();
                }, self.bounceTimeout);
            }, self.scrollTimeout);
        });
    }
}
