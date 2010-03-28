NEWSBLUR.ReaderManageFeed = function(feed_id, options) {
    var defaults = {};
    
    this.options = $.extend({}, defaults, options);
    this.model = NEWSBLUR.AssetModel.reader();
    this.feed_id = feed_id;
    this.feed = this.model.get_feed(feed_id);
    this.feeds = this.model.get_feeds();
    this.google_favicon_url = 'http://www.google.com/s2/favicons?domain_url=';
    this.counters = {
        'classifier': 0
    };
    this.runner(feed_id);
};

NEWSBLUR.ReaderManageFeed.prototype = {
    
    runner: function() {
        this.make_modal();
        this.initialize_feed(this.feed_id);
        this.handle_cancel();
        this.open_modal();
        this.load_feed_classifier();
        
        this.$manage.bind('change', $.rescope(this.handle_change, this));
    },
    
    initialize_feed: function(feed_id) {
        this.feed_id = feed_id;
        this.feed = this.model.get_feed(feed_id);
        $('.NB-modal-title', this.$manage).html(this.feed['feed_title']);
        $('input[name=feed_id]', this.$manage).val(this.feed_id);
        $('input[name=rename_title]', this.$manage).val(this.feed['feed_title']);
    },
    
    make_modal: function() {
        var self = this;
        
        this.$manage = $.make('div', { className: 'NB-manage NB-modal' }, [
            $.make('form', { method: 'post', className: 'NB-manage-form' }, [
                $.make('div', { className: 'NB-manage-container'}, [
                    $.make('div', { className: 'NB-modal-loading' }),
                    $.make('h2', { className: 'NB-modal-title' }),
                    $.make('div', { className: 'NB-manage-field' }, [
                        $.make('h5', [
                            'What you ',
                            $.make('span', { className: 'NB-classifier-like' }, 'like')
                        ]),
                        $.make('div', { className: 'NB-manage-classifier NB-manage-classifier-likes' }),
                        $.make('h5', [
                            'What you ',
                            $.make('span', { className: 'NB-classifier-dislike' }, 'dislike')
                        ]),
                        $.make('div', { className: 'NB-manage-classifier NB-manage-classifier-dislikes' }),
                        $.make('h5', 'Management'),
                        $.make('div', { className: 'NB-manage-management' }, [
                            $.make('div', { className: 'NB-manage-rename' }, [
                                $.make('label', { className: 'NB-manage-rename-label', 'for': 'id_rename' }, "Feed Title: "),
                                $.make('input', { name: 'rename_title', id: 'id_rename' }),
                            ]),
                            $.make('a', { className: 'NB-manage-delete'}, "Rename feed"),
                            $.make('a', { className: 'NB-manage-delete'}, "Delete this feed")
                        ])
                    ])
                ]),
                $.make('div', { className: 'NB-manage-feed-chooser-container'}, [
                    this.make_feed_chooser()
                ]),
                $.make('div', { className: 'NB-modal-submit' }, [
                    $.make('input', { name: 'feed_id', type: 'hidden' }),
                    $.make('input', { type: 'submit', disabled: 'true', className: 'NB-disabled', value: 'Check what you like above...' }),
                    ' or ',
                    $.make('a', { href: '#', className: 'NB-modal-cancel' }, 'cancel')
                ])
            ]).bind('submit', function(e) {
                e.preventDefault();
                self.save();
                return false;
            })
        ]);
    
    },
    
    make_feed_chooser: function() {
        var $chooser = $.make('select', { name: 'feed', className: 'NB-manage-feed-chooser' });
        
        for (var f in this.feeds) {
            var feed = this.feeds[f];
            var $option = $.make('option', { value: feed.id }, feed.feed_title);
            $option.appendTo($chooser);
            
            if (feed.id == this.feed_id) {
                $option.attr('selected', true);
            }
        }
        
        $('option', $chooser).tsort();
        return $chooser;
    },
    
    make_classifiers: function(classifiers, score) {
        var $classifiers = $.make('div');
        var i = this.counters['classifier'];
        var opinion = (score == 1 ? 'like_' : 'dislike_');
        
        // Tags
        var $tags = $.make('div', { className: 'NB-classifiers NB-classifier-tags'});
        for (var t in classifiers.tags) {
            if (classifiers.tags[t] == score) {
                var $tag = this.make_tag(t, i++, opinion);
                $tags.append($tag);
            }
        }
        
        // Authors
        var $authors = $.make('div', { className: 'NB-classifiers NB-classifier-authors'});
        for (var fa in classifiers.authors) {
            if (classifiers.authors[fa] == score) {
                var $author = this.make_author(fa, i++, opinion);
                $authors.append($author);
            }
        }
        
        // Titles
        var $titles = $.make('div', { className: 'NB-classifiers NB-classifier-titles'});
        for (var t in classifiers.titles) {
            if (classifiers.titles[t] == score) {
                var $title = this.make_title(t, i++, opinion);
                $titles.append($title);
            }
        }
        
        // Publisher
        var $publishers = $.make('div', { className: 'NB-classifiers NB-classifier-publishers'});
        for (var p in classifiers.feeds) {
            if (classifiers.feeds[p] == score) {
                var $publisher = this.make_tag(p, i++, opinion);
                $publishers.append($publisher);
            }
        }
        
        $classifiers.append($tags);
        $classifiers.append($authors);
        $classifiers.append($titles);
        $classifiers.append($publishers);
        
        if (!$('.NB-classifier', $classifiers).length) {
            var $empty_classifier = $.make('div', { className: 'NB-classifier-empty' }, [
                'No opinions yet. Use the ',
                $.make('img', { src: NEWSBLUR.Globals.MEDIA_URL + 'img/reader/thumbs-down.png', className: 'NB-dislike' }),
                $.make('img', { src: NEWSBLUR.Globals.MEDIA_URL + 'img/reader/thumbs-up.png', className: 'NB-like' }),
                ' buttons next to stories.'
            ]);
            $classifiers.append($empty_classifier);
        }
        
        this.counters['classifier'] = i;
        return $classifiers;
    },
    
    make_author: function(feed_author, i, opinion) {
        var $author = $.make('span', { className: 'NB-classifier NB-classifier-author' }, [
            $.make('input', { type: 'checkbox', name: opinion+'author', value: feed_author, id: 'classifier_author_'+i, checked: 'checked' }),
            $.make('label', { 'for': 'classifier_author_'+i }, [
                $.make('b', 'Author: '),
                $.make('span', feed_author)
            ])
        ]);
        return $author;
    },
    
    make_tag: function(tag, t, opinion) {
        var $tag = $.make('span', { className: 'NB-classifier-tag-container' }, [
            $.make('span', { className: 'NB-classifier NB-classifier-tag' }, [
                $.make('input', { type: 'checkbox', name: opinion+'tag', value: tag, id: 'classifier_tag_'+t, checked: 'checked' }),
                $.make('label', { 'for': 'classifier_tag_'+t }, [
                    $.make('b', 'Tag: '),
                    $.make('span', tag)
                ])
            ])
        ]);
        return $tag;
    },
    
    make_publisher: function(publisher, i, opinion) {
        var $publisher = $.make('div', { className: 'NB-classifier NB-classifier-publisher' }, [
            $.make('input', { type: 'checkbox', name: opinion+'facet', value: 'publisher', id: 'classifier_publisher', checked: 'checked' }),
            $.make('label', { 'for': 'classifier_publisher' }, [
                $.make('img', { className: 'feed_favicon', src: this.google_favicon_url + publisher.feed_link }),
                $.make('span', { className: 'feed_title' }, [
                    $.make('b', 'Publisher: '),
                    $.make('span', publisher.feed_title)
                ])
            ])
        ]);
        return $publisher;
    },
    
    make_title: function(title, t, opinion) {
        var $title = $.make('div', { className: 'NB-classifier NB-classifier-title' }, [
            $.make('input', { type: 'checkbox', name: opinion+'title', value: title, id: 'classifier_title_'+t, checked: 'checked' }),
            $.make('label', { 'for': 'classifier_title_'+t }, [
                $.make('b', 'Title: '),
                $.make('span', title)
            ])
        ]);
        return $title;
    },
    
    load_feed_classifier: function() {
        var $loading = $('.NB-modal-loading', this.$manage);
        $loading.addClass('NB-active');
        
        this.model.get_feed_classifier(this.feed_id, $.rescope(this.post_load_feed_classifier, this));
    },
    
    post_load_feed_classifier: function(e, classifiers) {
        var $loading = $('.NB-modal-loading', this.$manage);
        $loading.removeClass('NB-active');
        
        var $likes = $('.NB-manage-classifier-likes');
        var $classifiers_likes = this.make_classifiers(classifiers.payload, 1);
        $likes.empty().append($classifiers_likes);
        
        var $dislikes = $('.NB-manage-classifier-dislikes');
        var $classifiers_dislikes = this.make_classifiers(classifiers.payload, -1);
        $dislikes.empty().append($classifiers_dislikes);
        
        $('.NB-classifier', this.$manage).corner('4px');
    },
    
    open_modal: function() {
        var self = this;

        var $holder = $.make('div', { className: 'NB-modal-holder' }).append(this.$manage).appendTo('body').css({'visibility': 'hidden', 'display': 'block', 'width': 600});
        var height = $('.NB-manage', $holder).outerHeight(true);
        $holder.css({'visibility': 'visible', 'display': 'none'});
        
        this.$manage.modal({
            'minWidth': 600,
            'minHeight': height,
            'overlayClose': true,
            'onOpen': function (dialog) {
	            dialog.overlay.fadeIn(200, function () {
		            dialog.container.fadeIn(200);
		            dialog.data.fadeIn(200);
	            });
            },
            'onShow': function(dialog) {
                $('#simplemodal-container').corner('6px').css({'width': 600, 'height': height});
                // $('.NB-classifier-tag', self.$manage).corner('4px');
            },
            'onClose': function(dialog) {
                dialog.data.hide().empty().remove();
                dialog.container.hide().empty().remove();
                dialog.overlay.fadeOut(200, function() {
                    dialog.overlay.empty().remove();
                    $.modal.close();
                });
                $('.NB-modal-holder').empty().remove();
            }
        });
    },
    
    handle_cancel: function() {
        var $cancel = $('.NB-modal-cancel', this.$manage);
        
        $cancel.click(function(e) {
            e.preventDefault();
            $.modal.close();
        });
    },
    
    serialize_classifier: function() {
        var data = $('input', this.$manage).serialize();
        
        return data;
    },
    
    save: function() {
        var $save = $('.NB-modal input[type=submit]');
        var data = this.serialize_classifier();
        
        $save.text('Saving...').addClass('NB-disabled').attr('disabled', true);
        this.model.save_classifier_publisher(data, function() {
            $.modal.close();
        });
    },

    handle_change: function(elem, e) {
        var self = this;
        
        $.targetIs(e, { tagSelector: '.NB-manage-feed-chooser' }, function($t, $p){
            var feed_id = $t.val();
            self.initialize_feed(feed_id);
            self.load_feed_classifier();
        });
        
        $.targetIs(e, { tagSelector: 'input', childOf: '.NB-classifier' }, function($t, $p) {
            var $submit = $('input[type=submit]', self.$manage);
            $submit.removeClass("NB-disabled").removeAttr('disabled').attr('value', 'Save');
        });
    }
};