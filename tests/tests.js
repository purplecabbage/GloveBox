// A little sugar on top of qunit
QUnit.chain = function(tests, delay) {
    QUnit.stop();
    if (tests.length > 0) {
        setTimeout(function() {
            tests.pop()();
            QUnit.chain(tests, delay);
        }, delay);
    } else QUnit.start();
};

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
        module('Construction/destruction', {
           setup:function() {
  //             glovebox = new GloveBox("masterList");
           },
           teardown:function(){
//               glovebox = null;
           }
        });
        test('Baseline GloveBox initilization', function() {
            expect(6);
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
            ok(glovebox2.scrollY, 'Default scrolling direction is vertical');
            ok(!glovebox2.scrollX, 'Horizontal scrolling is off by default');
        });
        test('GloveBox destruction', function(){
            // does it clean up after itself? any side effects from defining two gloveboxes on the same element?
        })
        test('GloveBox options configuration', function() {
            expect(3);
            var glovebox = new GloveBox('masterList', { scrollX:true, scrollY:true, parentHeight:'100px'});
            ok(glovebox.scrollX, 'scrollX=true in options object should be true in GloveBox object');
            ok(glovebox.scrollY, 'scrollY=true in options object should be true in GloveBox object');
            equals(document.getElementById('masterList').parentNode.style.height, '100px', 'Can set GloveBox element\'s parent\'s height')
        });
        
        module('Scrolling', {
            setup:function() {
                glovebox = new GloveBox("masterList");
            },
            teardown:function() {
                glovebox = null;
            }
        });
        test('Scrolling directions', function() {
            expect(1);
            QUnit.chain([function() {
                glovebox.scrollY = false;
                glovebox.scrollX = true;
                glovebox.y = -100;
                glovebox.finishScrolling();
                equals(glovebox.y, 0, 'Setting y when scrollY = false should do nothing');
            }], self.scrollTimeout);
        });
        test('Vertical scrolling test in range', function() {
            expect(1);
            QUnit.chain([function() {
                glovebox.y = -100;
                glovebox.finishScrolling();
                equals(glovebox.y, -100, 'Setting y to in-range value works');
            }], self.scrollTimeout);
        });
        test('Vertical scrolling test out of range', function() {
            expect(2);
            QUnit.chain([function() {
                glovebox.y = 100;
                glovebox.finishScrolling();
                equals(glovebox.y, 0, 'Setting y to out-of-range positive value works');
            }, function() {
                glovebox.y = -10000;
                glovebox.finishScrolling();
                equals(glovebox.y, -800, 'Setting y to out-of-range negative value works');
            }], self.bounceTimeout);
        });
    }
}
