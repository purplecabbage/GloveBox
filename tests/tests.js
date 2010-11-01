// A little sugar on top of qunit
QUnit.chain = function(tests, delay) {
    if (tests.length > 0) {
        setTimeout(function() {
            tests.shift()();
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
                // perhaps should throw its own exception?
                equals(e.message, "Cannot read property 'parentNode' of null");
            }
            ok(glovebox2.scrollY, 'Default scrolling direction is vertical');
            ok(!glovebox2.scrollX, 'Horizontal scrolling is off by default');
        });
        test('GloveBox destruction', function(){
            // does it clean up after itself? any side effects from defining two gloveboxes on the same element?
            // what about two gloveboxes on same element with different direction styles?
            expect(1);
            var g_one = new GloveBox('masterList', {scrollX:true, scrollY:false});
            g_one.x = -200;
            g_one.finishScrolling();
            QUnit.chain([function() {
                g_two = new GloveBox('masterList', {scrollY:true, scrollX:false});
                g_two.y = -1*HALF_H;
                g_two.finishScrolling();
            }, function() {
                equals(g_two.y, -1*HALF_H, 'New GloveBox instances on same element override instantiation parameters');
            }], self.bounceTimeout);
            
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
                box = GloveBox.GetOffset(glovebox.element);
                HALF_H = (Math.floor(box.height/2));
            },
            teardown:function() {
                glovebox = null;
                box = null;
                HALF_H = null;
            }
        });
        test('Scrolling directions', function() {
            QUnit.stop();
            expect(1);
            var lastKnownY = glovebox.y;
            glovebox.scrollY = false;
            glovebox.scrollX = true;
            glovebox.y = -1*HALF_H;
            glovebox.finishScrolling();
            QUnit.chain([function() {
                equals(glovebox.y, lastKnownY, 'Setting y when scrollY = false should do nothing');
            }], self.scrollTimeout);
        });
        test('Vertical scrolling test in range', function() {
            QUnit.stop();
            expect(1);
            glovebox.y = -1*HALF_H;
            glovebox.finishScrolling();
            QUnit.chain([function() {
                equals(glovebox.y, -1*HALF_H, 'Setting y to in-range value works');
            }], self.scrollTimeout);
        });
        test('Vertical scrolling test out of range', function() {
            QUnit.stop();
            expect(2);
            glovebox.y = 1*HALF_H;
            glovebox.finishScrolling();
            QUnit.chain([function() {
                equals(glovebox.y, 0, 'Setting y to out-of-range positive value works');
                glovebox.y = -10*HALF_H;
                glovebox.finishScrolling();
            }, function() {
                equals(glovebox.y, -1*(box.height-glovebox.parentCoords.height), 'Setting y to out-of-range negative value works');
            }], self.bounceTimeout);
        });
    }
}
