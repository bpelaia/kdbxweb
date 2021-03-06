'use strict';

var expect = require('expect.js'),
    kdbxweb = require('../../lib/index'),
    TestResources = require('../test-support/test-resources');

describe('Kdbx', function () {
    it('should load simple file', function (done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), TestResources.demoKey);
        kdbxweb.Kdbx.load(TestResources.demoKdbx, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            expect(db.meta.generator).to.be('KeePass');
            checkDb(db);
            done();
        });
    });

    it('should load simple xml file', function (done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(''));
        var xml = kdbxweb.ByteUtils.bytesToString(TestResources.demoXml).toString('utf8');
        kdbxweb.Kdbx.loadXml(xml, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            expect(db.meta.generator).to.be('KeePass');
            checkDb(db);
            done();
        });
    });

    it('should generate error for malformed xml file', function (done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(''));
        kdbxweb.Kdbx.loadXml('malformed-xml', cred, function(db, e) {
            expect(db).to.be(null);
            expect(e).to.be.a(kdbxweb.KdbxError);
            expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.FileCorrupt);
            expect(e.message).to.contain('bad xml');
            done();
        });
    });

    it('should load utf8 uncompressed file', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('пароль'));
        kdbxweb.Kdbx.load(TestResources.cyrillicKdbx, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            done();
        });
    });

    it('should load a file with binary key', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('test'), TestResources.binKeyKey);
        kdbxweb.Kdbx.load(TestResources.binKeyKdbx, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            done();
        });
    });

    it('should load a file with empty pass', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(''));
        kdbxweb.Kdbx.load(TestResources.emptyPass, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            done();
        });
    });

    it('should load a file with empty pass and keyfile', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(''), TestResources.emptyPassWithKeyFileKey);
        kdbxweb.Kdbx.load(TestResources.emptyPassWithKeyFile, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            done();
        });
    });

    it('should load a file with no pass and keyfile', function(done) {
        var cred = new kdbxweb.Credentials(null, TestResources.noPassWithKeyFileKey);
        kdbxweb.Kdbx.load(TestResources.noPassWithKeyFile, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            done();
        });
    });

    //it('should load a file with null pass', function(done) {
    //    var cred = new kdbxweb.Credentials(null);
    //    kdbxweb.Kdbx.load(TestResources.emptyPass, cred, function(db, err) {
    //        expect(db).to.be.a(kdbxweb.Kdbx);
    //        done();
    //    });
    //});

    it('should successfully load saved file', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), TestResources.demoKey);
        kdbxweb.Kdbx.load(TestResources.demoKdbx, cred, function(db) {
            expect(db).to.be.a(kdbxweb.Kdbx);
            db.save(function(ab) {
                kdbxweb.Kdbx.load(ab, cred, function(db) {
                    expect(db.meta.generator).to.be('KdbxWeb');
                    checkDb(db);
                    done();
                });
            });
        });
    });

    it('should create new database', function(done) {
        var keyFile = kdbxweb.Credentials.createRandomKeyFile();
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), keyFile);
        var db = kdbxweb.Kdbx.create(cred, 'example');
        var subGroup = db.createGroup(db.getDefaultGroup(), 'subgroup');
        var entry = db.createEntry(subGroup);
        db.meta.customData.key = 'val';
        db.createDefaultGroup();
        db.createRecycleBin();
        entry.fields.Title = 'title';
        entry.fields.UserName = 'user';
        entry.fields.Password = kdbxweb.ProtectedValue.fromString('pass');
        entry.fields.Notes = 'notes';
        entry.fields.URL = 'url';
        entry.binaries['bin.txt'] = kdbxweb.ProtectedValue.fromString('bin.txt content');
        entry.pushHistory();
        entry.fields.Title = 'newtitle';
        entry.fields.UserName = 'newuser';
        entry.fields.Password = kdbxweb.ProtectedValue.fromString('newpass');
        entry.fields.CustomPlain = 'custom-plain';
        entry.fields.CustomProtected = kdbxweb.ProtectedValue.fromString('custom-protected');
        entry.times.update();
        db.save(function(ab) {
            kdbxweb.Kdbx.load(ab, cred, function(db) {
                expect(db.meta.generator).to.be('KdbxWeb');
                expect(db.meta.customData.key).to.be('val');
                expect(db.groups.length).to.be(1);
                expect(db.groups[0].groups.length).to.be(2);
                expect(db.getGroup(db.meta.recycleBinUuid)).to.be(db.groups[0].groups[0]);
                //require('fs').writeFileSync('resources/test.kdbx', new Buffer(new Uint8Array(ab)));
                //require('fs').writeFileSync('resources/test.key', new Buffer(keyFile));
                done();
            });
        });
    });

    it('should generate error for bad arguments', function () {
        expect(function() {
            kdbxweb.Kdbx.load('file');
        }).to.throwException(function(e) {
                expect(e).to.be.a(kdbxweb.KdbxError);
                expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
                expect(e.message).to.contain('data');
            });
        expect(function() {
            kdbxweb.Kdbx.load(new ArrayBuffer(0), '123');
        }).to.throwException(function(e) {
                expect(e).to.be.a(kdbxweb.KdbxError);
                expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
                expect(e.message).to.contain('credentials');
            });
        expect(function() {
            kdbxweb.Kdbx.load(new ArrayBuffer(0), null);
        }).to.throwException(function(e) {
                expect(e).to.be.a(kdbxweb.KdbxError);
                expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
                expect(e.message).to.contain('credentials');
            });
        expect(function() {
            var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'));
            cred.setPassword('string');
        }).to.throwException(function(e) {
                expect(e).to.be.a(kdbxweb.KdbxError);
                expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
                expect(e.message).to.contain('password');
            });
        expect(function() {
            var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'));
            cred.setKeyFile(123);
        }).to.throwException(function(e) {
                expect(e).to.be.a(kdbxweb.KdbxError);
                expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
                expect(e.message).to.contain('keyFile');
            });
        expect(function() {
            kdbxweb.Kdbx.create('file');
        }).to.throwException(function(e) {
            expect(e).to.be.a(kdbxweb.KdbxError);
            expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
            expect(e.message).to.contain('credentials');
        });

        expect(function() {
            kdbxweb.Kdbx.loadXml(new ArrayBuffer(0));
        }).to.throwException(function(e) {
            expect(e).to.be.a(kdbxweb.KdbxError);
            expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
            expect(e.message).to.contain('data');
        });
        expect(function() {
            kdbxweb.Kdbx.loadXml('str', null);
        }).to.throwException(function(e) {
            expect(e).to.be.a(kdbxweb.KdbxError);
            expect(e.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidArg);
            expect(e.message).to.contain('credentials');
        });
    });

    it('generates error for bad password', function () {
        kdbxweb.Kdbx.load(TestResources.demoKdbx,
            new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('badpass')),
            function(db, err) {
                expect(db).to.be(null);
                expect(err).to.be.ok();
                expect(err).to.be.a(kdbxweb.KdbxError);
                expect(err.code).to.be(kdbxweb.Consts.ErrorCodes.InvalidKey);
            });
    });

    it('deletes and restores an entry', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), TestResources.demoKey);
        kdbxweb.Kdbx.load(TestResources.demoKdbx, cred, function(db) {
            var parentGroup = db.getDefaultGroup().groups[1];
            var group = parentGroup.groups[parentGroup.groups.length - 1];
            var recycleBin = db.getGroup(db.meta.recycleBinUuid);
            var recycleBinLength = recycleBin.groups.length;
            var groupLength = parentGroup.groups.length;
            db.remove(group);
            expect(recycleBin.groups.length).to.be(recycleBinLength + 1);
            expect(group.groups.length).to.be(groupLength - 1);
            db.move(group, parentGroup);
            expect(recycleBin.groups.length).to.be(recycleBinLength);
            checkDb(db);
            done();
        });
    });

    it('deletes entry without recycle bin', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), TestResources.demoKey);
        kdbxweb.Kdbx.load(TestResources.demoKdbx, cred, function(db) {
            var parentGroup = db.getDefaultGroup().groups[1];
            var group = parentGroup.groups[parentGroup.groups.length - 1];
            var deletedObjectsLength = db.deletedObjects.length;
            db.meta.recycleBinEnabled = false;
            db.remove(group);
            expect(db.deletedObjects.length).to.be(deletedObjectsLength + 1);
            expect(db.deletedObjects[db.deletedObjects.length - 1].uuid).to.be(group.uuid);
            done();
        });
    });

    it('creates a recycle bin if it is enabled but not created', function(done) {
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), TestResources.demoKey);
        kdbxweb.Kdbx.load(TestResources.demoKdbx, cred, function(db) {
            var parentGroup = db.getDefaultGroup().groups[1];
            var group = parentGroup.groups[parentGroup.groups.length - 1];
            db.meta.recycleBinUuid = new kdbxweb.KdbxUuid();
            expect(db.meta.recycleBinUuid.empty).to.be(true);
            var recycleBin = db.getGroup(db.meta.recycleBinUuid);
            expect(recycleBin).to.be(undefined);
            var groupLength = parentGroup.groups.length;
            db.remove(group);
            expect(db.meta.recycleBinUuid.empty).to.be(false);
            recycleBin = db.getGroup(db.meta.recycleBinUuid);
            expect(recycleBin).to.be.ok();
            expect(recycleBin.groups.length).to.be(1);
            expect(group.groups.length).to.be(groupLength - 1);
            done();
        });
    });

    it('saves db to xml', function(done) {
        var keyFile = kdbxweb.Credentials.createRandomKeyFile();
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), keyFile);
        var db = kdbxweb.Kdbx.create(cred, 'example');
        var subGroup = db.createGroup(db.getDefaultGroup(), 'subgroup');
        var entry = db.createEntry(subGroup);
        entry.fields.Title = 'title';
        entry.fields.UserName = 'user';
        entry.fields.Password = kdbxweb.ProtectedValue.fromString('pass');
        entry.fields.Notes = 'notes';
        entry.fields.URL = 'url';
        entry.times.update();
        db.saveXml(function(xml) {
            expect(xml).to.contain('<Value ProtectInMemory="True">pass</Value>');
            done();
        });
    });

    it('cleanups by history rules', function() {
        var keyFile = kdbxweb.Credentials.createRandomKeyFile();
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), keyFile);
        var db = kdbxweb.Kdbx.create(cred, 'example');
        var subGroup = db.createGroup(db.getDefaultGroup(), 'subgroup');
        var entry = db.createEntry(subGroup);
        var i;
        for (i = 0; i < 3; i++) {
            entry.fields.Title = i.toString();
            entry.pushHistory();
        }
        expect(entry.history[0].fields.Title).to.be('0');
        expect(entry.history.length).to.be(3);
        db.cleanup({historyRules: true});
        expect(entry.history.length).to.be(3);
        for (i = 3; i < 10; i++) {
            entry.fields.Title = i.toString();
            entry.pushHistory();
        }
        expect(entry.history[0].fields.Title).to.be('0');
        expect(entry.history.length).to.be(10);
        expect(entry.history[0].fields.Title).to.be('0');
        db.cleanup({historyRules: true});
        expect(entry.history[0].fields.Title).to.be('0');
        expect(entry.history.length).to.be(10);
        for (i = 10; i < 11; i++) {
            entry.fields.Title = i.toString();
            entry.pushHistory();
        }
        expect(entry.history.length).to.be(11);
        db.cleanup({historyRules: true});
        expect(entry.history[0].fields.Title).to.be('1');
        expect(entry.history.length).to.be(10);
        for (i = 11; i < 20; i++) {
            entry.fields.Title = i.toString();
            entry.pushHistory();
        }
        db.cleanup({historyRules: true});
        expect(entry.history[0].fields.Title).to.be('10');
        expect(entry.history.length).to.be(10);
        for (i = 20; i < 30; i++) {
            entry.fields.Title = i.toString();
            entry.pushHistory();
        }
        db.meta.historyMaxItems = -1;
        db.cleanup({historyRules: true});
        expect(entry.history[0].fields.Title).to.be('10');
        expect(entry.history.length).to.be(20);
        db.cleanup();
        db.cleanup({});
        expect(entry.history.length).to.be(20);
        db.meta.historyMaxItems = undefined;
        db.cleanup({historyRules: true});
        expect(entry.history[0].fields.Title).to.be('10');
        expect(entry.history.length).to.be(20);
    });

    it('cleanups custom icons', function() {
        var keyFile = kdbxweb.Credentials.createRandomKeyFile();
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), keyFile);
        var db = kdbxweb.Kdbx.create(cred, 'example');
        var subGroup = db.createGroup(db.getDefaultGroup(), 'subgroup');
        var entry = db.createEntry(subGroup);
        var i;
        for (i = 0; i < 3; i++) {
            entry.fields.Title = i.toString();
            entry.customIcon = 'i1';
            entry.pushHistory();
        }
        entry.customIcon = 'i2';
        subGroup.customIcon = 'i3';
        db.meta.customIcons.i1 = 'icon1';
        db.meta.customIcons.i2 = 'icon2';
        db.meta.customIcons.i3 = 'icon3';
        db.meta.customIcons.r1 = 'rem1';
        db.meta.customIcons.r2 = 'rem2';
        db.meta.customIcons.r3 = 'rem3';
        db.cleanup({customIcons: true});
        expect(db.meta.customIcons).to.eql({ i1: 'icon1', i2: 'icon2', i3: 'icon3' });
    });

    it('cleanups binaries', function() {
        var keyFile = kdbxweb.Credentials.createRandomKeyFile();
        var cred = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('demo'), keyFile);
        var db = kdbxweb.Kdbx.create(cred, 'example');
        var subGroup = db.createGroup(db.getDefaultGroup(), 'subgroup');
        var entry = db.createEntry(subGroup);
        var i;
        for (i = 0; i < 3; i++) {
            entry.fields.Title = i.toString();
            entry.binaries.bin = { ref: 'b1' };
            entry.pushHistory();
        }
        entry.binaries.bin = { ref: 'b2' };
        var b1 = new Uint8Array([1]).buffer;
        var b2 = new Uint8Array([2]).buffer;
        var b3 = new Uint8Array([3]).buffer;
        db.meta.binaries.b1 = b1;
        db.meta.binaries.b2 = b2;
        db.meta.binaries.b3 = b3;
        db.cleanup({binaries: true});
        expect(db.meta.binaries).to.eql({ b1: b1, b2: b2 });
    });

    function checkDb(db) {
        expect(db.meta.name).to.be('demo');
        expect(db.meta.nameChanged.toISOString()).to.be('2015-08-16T14:45:23.000Z');
        expect(db.meta.desc).to.be('demo db');
        expect(db.meta.descChanged.toISOString()).to.be('2015-08-16T14:45:23.000Z');
        expect(db.meta.defaultUser).to.be('me');
        expect(db.meta.defaultUserChanged.toISOString()).to.be('2015-08-16T14:45:23.000Z');
        expect(db.meta.mntncHistoryDays).to.be(365);
        expect(db.meta.color).to.be('#FF0000');
        expect(db.meta.keyChanged.toISOString()).to.be('2015-08-16T14:53:28.000Z');
        expect(db.meta.keyChangeRec).to.be(-1);
        expect(db.meta.keyChangeForce).to.be(-1);
        expect(db.meta.recycleBinEnabled).to.be(true);
        expect(db.meta.recycleBinUuid.id).to.be('fZ7q9U4TBU+5VomeW3BZOQ==');
        expect(db.meta.recycleBinChanged.toISOString()).to.be('2015-08-16T14:44:42.000Z');
        expect(db.meta.entryTemplatesGroup.empty).to.be(true);
        expect(db.meta.entryTemplatesGroupChanged.toISOString()).to.be('2015-08-16T14:44:42.000Z');
        expect(db.meta.historyMaxItems).to.be(10);
        expect(db.meta.historyMaxSize).to.be(6291456);
        expect(db.meta.lastSelectedGroup.id).to.be('LWIve8M1xUuvrORCdYeRgA==');
        expect(db.meta.lastTopVisibleGroup.id).to.be('LWIve8M1xUuvrORCdYeRgA==');
        expect(db.meta.memoryProtection.title).to.be(false);
        expect(db.meta.memoryProtection.userName).to.be(false);
        expect(db.meta.memoryProtection.password).to.be(true);
        expect(db.meta.memoryProtection.url).to.be(false);
        expect(db.meta.memoryProtection.notes).to.be(false);
        expect(Object.keys(db.meta.customIcons).length).to.be(1);
        expect(db.meta.customIcons['rr3vZ1ozek+R4pAcLeqw5w==']).to.be.ok();
        expect(Object.keys(db.meta.binaries).length).to.be(1);
        expect(db.meta.binaries['0']).to.be.ok();

        expect(db.deletedObjects.length).to.be(1);
        expect(db.deletedObjects[0].uuid.id).to.be('LtoeZ26BBkqtr93N9tqO4g==');
        expect(db.deletedObjects[0].deletionTime.toISOString()).to.be('2015-08-16T14:50:13.000Z');

        expect(db.groups.length).to.be(1);
        checkGroup(db.groups[0], {
            uuid: 'LWIve8M1xUuvrORCdYeRgA==',
            name: 'sample',
            notes: '',
            icon: 49,
            times: {
                creationTime: new Date('2015-08-16T14:44:42Z'),
                lastModTime: new Date('2015-08-16T14:44:42Z'),
                lastAccessTime: new Date('2015-08-16T14:50:15Z'),
                expiryTime: new Date('2015-08-16T14:43:04Z'),
                expires: false,
                usageCount: 28,
                locationChanged: new Date('2015-08-16T14:44:42Z')
            },
            expanded: true,
            defaultAutoTypeSeq: '',
            enableAutoType: null,
            enableSearching: null,
            lastTopVisibleEntry: 'HzYFsnGCkEKyrPtOa6bNMA==',
            groups: 4,
            entries: 2
        });
        var topGroup = db.groups[0];
        checkGroup(topGroup.groups[0], {
            uuid: 'GaN4R2PK1U63ckOVDzTY6w==',
            name: 'General',
            notes: '',
            icon: 48,
            times: {
                creationTime: new Date('2015-08-16T14:45:23Z'),
                lastModTime: new Date('2015-08-16T14:45:23Z'),
                lastAccessTime: new Date('2015-08-16T14:45:51Z'),
                expiryTime: new Date('2015-08-16T14:43:04Z'),
                expires: false,
                usageCount: 3,
                locationChanged: new Date('2015-08-16T14:45:23Z')
            },
            expanded: true,
            defaultAutoTypeSeq: '',
            enableAutoType: null,
            enableSearching: null,
            lastTopVisibleEntry: 'vqcoCvE9/k6PSgutKI6snw==',
            groups: 0,
            entries: 1
        });
        var expEntry = {
            uuid: 'vqcoCvE9/k6PSgutKI6snw==',
            icon: 2,
            customIcon: undefined,
            fgColor: '#FF0000',
            bgColor: '#00FF00',
            overrideUrl: 'cmd://{GOOGLECHROME} "{URL}"',
            tags: ['my', 'tag'],
            times: {
                creationTime: new Date('2015-08-16T14:45:54Z'),
                lastModTime: new Date('2015-08-16T14:49:12Z'),
                lastAccessTime: new Date('2015-08-16T14:49:23Z'),
                expiryTime: new Date('2015-08-29T21:00:00Z'),
                expires: true,
                usageCount: 3,
                locationChanged: new Date('2015-08-16T14:45:54Z')
            },
            fields: {
                Notes: 'some notes',
                Title: 'my entry',
                URL: 'http://me.me',
                UserName: 'me',
                'my field': 'my val'
            },
            prFields: {
                Password: 'mypass',
                'my field protected': 'protected val'
            },
            binaries: {
                attachment: { ref: '0', value: true }
            },
            autoType: { enabled: true, obfuscation: 0, defaultSequence: '{USERNAME}{TAB}{PASSWORD}{ENTER}{custom}',
                items: [
                { window: 'chrome', keystrokeSequence: '{USERNAME}{TAB}{PASSWORD}{ENTER}{custom}{custom-key}' }
            ] },
            history: 1
        };
        checkEntry(topGroup.groups[0].entries[0], expEntry);
        delete expEntry.times;
        expEntry.fields.Title = 'my-entry';
        expEntry.prFields.Password = 'pass';
        expEntry.history = 0;
        expEntry.binaries.attachment.value = false;
        checkEntry(topGroup.groups[0].entries[0].history[0], expEntry);
        checkGroup(topGroup.groups[1], {
            uuid: 'QF6yl7EUVk6+NgdJtyl3sg==',
            name: 'Windows',
            notes: '',
            icon: 38,
            expanded: false,
            defaultAutoTypeSeq: '',
            enableAutoType: null,
            enableSearching: null,
            lastTopVisibleEntry: 'AAAAAAAAAAAAAAAAAAAAAA==',
            groups: 1,
            entries: 0
        });
        checkGroup(topGroup.groups[2], {
            uuid: 'nBnVmN3JYkalgnMu9fVcXQ==',
            name: 'Internet',
            notes: '',
            icon: 1,
            expanded: true,
            defaultAutoTypeSeq: '',
            enableAutoType: null,
            enableSearching: null,
            lastTopVisibleEntry: 'AAAAAAAAAAAAAAAAAAAAAA==',
            groups: 0,
            entries: 0
        });
        checkGroup(topGroup.groups[3], {
            uuid: 'fZ7q9U4TBU+5VomeW3BZOQ==',
            name: 'Recycle Bin',
            notes: '',
            icon: 43,
            expanded: false,
            defaultAutoTypeSeq: '',
            enableAutoType: false,
            enableSearching: false,
            lastTopVisibleEntry: 'AAAAAAAAAAAAAAAAAAAAAA==',
            groups: 2,
            entries: 1
        });
    }

    function checkGroup(group, exp) {
        expect(group).to.be.ok();
        expect(group.uuid.id).to.be(exp.uuid);
        expect(group.name).to.be(exp.name);
        expect(group.notes).to.be(exp.notes);
        expect(group.icon).to.be(exp.icon);
        expect(group.expanded).to.be(exp.expanded);
        expect(group.defaultAutoTypeSeq).to.be(exp.defaultAutoTypeSeq);
        expect(group.enableAutoType).to.be(exp.enableAutoType);
        expect(group.enableSearching).to.be(exp.enableSearching);
        expect(group.lastTopVisibleEntry.id).to.be(exp.lastTopVisibleEntry);
        expect(group.groups.length).to.be(exp.groups);
        expect(group.entries.length).to.be(exp.entries);
        if (exp.times) {
            expect(group.times).to.be.eql(exp.times);
        }
        expect(group.autoType).to.be.eql(exp.autoType);
    }

    function checkEntry(entry, exp) {
        expect(entry).to.be.ok();
        expect(entry.uuid.id).to.be(exp.uuid);
        expect(entry.icon).to.be(exp.icon);
        expect(entry.customIcon).to.be(exp.customIcon);
        expect(entry.fgColor).to.be(exp.fgColor);
        expect(entry.bgColor).to.be(exp.bgColor);
        expect(entry.overrideUrl).to.be(exp.overrideUrl);
        expect(entry.tags).to.be.eql(exp.tags);
        if (exp.times) {
            expect(entry.times).to.be.eql(exp.times);
        }
        expect(Object.keys(entry.fields).length).to.be(Object.keys(exp.fields).length + Object.keys(exp.prFields).length);
        Object.keys(exp.fields).forEach(function(field) {
            expect(entry.fields[field]).to.be(exp.fields[field]);
        });
        Object.keys(exp.prFields).forEach(function(field) {
            expect(entry.fields[field].getText()).to.be(exp.prFields[field]);
        });
        expect(Object.keys(entry.binaries).length).to.be(Object.keys(exp.binaries).length);
        Object.keys(exp.binaries).forEach(function(field) {
            expect(entry.binaries[field].ref).to.be(exp.binaries[field].ref);
            expect(!!entry.binaries[field].value).to.be(!!exp.binaries[field].value);
        });
        expect(entry.autoType).to.be.eql(exp.autoType);
        expect(entry.history.length).to.be(exp.history);
    }
});
