function Tests() { }
Tests.prototype = {
    run:function() {
        for (var t in this) {
            if (t.indexOf('Test') > -1) {
                this[t]();
            }
        }
    },
    Test:function() {
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
                ok(true, 'Expected exception raised when wrong ID string provided on construction');
                equals(e.message, 'Cannot instantiated GloveBox on non existent element.');
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
            }, 1000);
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
                }, 3000);
            }, 1000);
        });
    }
}
