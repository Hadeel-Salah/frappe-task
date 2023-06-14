frappe.views.ListSidebar = class ListSidebar {
	constructor(opts) {
		$.extend(this, opts);
		this.title = 'TestX45';
		this.sidebar_categories = ["My Workspaces", "Public", "Screens"];
		this.sidebar_pages = null; 
		this.screens_links = null; 
		this.make();
	}

	async get_pages() {
		if (this.sidebar_pages) {
			return this.sidebar_pages; 
		}
		// Check if data exists in local storage
		const storedData = localStorage.getItem('sidebar_pages');
		if (storedData) {
			this.sidebar_pages = JSON.parse(storedData);
			return this.sidebar_pages;
		}
		this.sidebar_pages = await frappe.xcall("frappe.desk.desktop.get_workspace_sidebar_items");
		// Store data in local storage
		localStorage.setItem('sidebar_pages', JSON.stringify(this.sidebar_pages));
		return this.sidebar_pages;
	}

	async get_pages_data(page) {
		return frappe.call("frappe.desk.desktop.get_desktop_page", {
			page: page,
		})
			.then((data) => {
				return data.message.cards.items;
			});
	}

	async get_all_pages_links(sidebar_pages) {
		if (this.screens_links) {
			return this.screens_links; 
		}
		// Check if data exists in local storage
		const storedData = localStorage.getItem('screens_links');
		if (storedData) {
			this.screens_links = JSON.parse(storedData);
			return this.screens_links;
		}
		const pageData = await Promise.all(sidebar_pages.map(page => this.get_pages_data(page)));
		const all_links = pageData.flat().map(array => array.links).flat();
		this.screens_links = all_links.map(link => ({
			title: link.label,
			route: link.link_to,
			public: 1
		}));
		// Store data in local storage
		localStorage.setItem('screens_links', JSON.stringify(this.screens_links));
		return this.screens_links;
	}

	make() {
		if (this.hide_sidebar || !frappe.boot.desk_settings.list_sidebar) return;
		const titleContainer = $('<div>').addClass('list-sidebar-title');
		const title = $('<h3>').text(this.title);
		titleContainer.append(title);

		this.parent.append(titleContainer);
		this.sidebar = $('<div>').addClass('list-sidebar-content');
		this.parent.append(this.sidebar);

		this.get_pages().then(sidebarPages => {
			this.sidebar_pages = sidebarPages; 
			return this.get_all_pages_links(sidebarPages.pages);
		}).then(screensLinks => {
			this.screens_links = screensLinks; 
			this.display_sidebar_categories();
		});
		
	}

	createSidebarItem(item) {
		const sidebarItem = $(`
			<div
				class="sidebar-item-container ${item.is_editable ? "is-draggable" : ""}"
				item-parent="${item.parent_page}"
				item-name="${item.title}"
				item-public="${item.public || 0}"
				item-is-hidden="${item.is_hidden || 0}"
			>
				<div class="desk-sidebar-item standard-sidebar-item ${item.selected ? "selected" : ""}">
					<a
						href="/app/${item.public ? frappe.router.slug(item.title) : "private/" + frappe.router.slug(item.title)}"
						class="item-anchor ${item.is_editable ? "" : "block-click"}" title="${__(item.title)}"
					>
						<span class="sidebar-item-icon" item-icon=${item.icon || "folder-normal"}>${frappe.utils.icon(
							item.icon || "folder-normal",
							"md"
						)}</span>
						<span class="sidebar-item-label">${__(item.title)}<span>
					</a>
					<div class="sidebar-item-control"></div>
				</div>
				<div class="sidebar-child-item nested-container"></div>
			</div>`);
	
		return sidebarItem;
	}
	
	// Refactored code for displaying sidebar categories
	display_sidebar_categories() {
		const categoriesContainer = $('<div>').addClass('standard-sidebar-section nested-container');
	
		this.sidebar_categories.forEach(category => {
			const sidebarSection = $(`<div class="standard-sidebar-section nested-container" data-title="${category}"></div>`);
			const title = $(`
				<div class="standard-sidebar-label">
					<span class="toggle-icon">${frappe.utils.icon("small-down", "xs")}</span>
					<span class="section-title">${category}</span>
				</div>`
			).appendTo(sidebarSection);
	
			if (category === "My Workspaces") {
				const workspacesContainer = $('<div>').addClass('sub-pages-container');
	
				const privatePages = this.sidebar_pages.pages.filter(page => !page.public);
				const rootPages = privatePages.filter(page => page.parent_page == "" || page.parent_page == null);
	
				rootPages.forEach(item => {
					const workspace =  this.createSidebarItem(item);
					workspacesContainer.append(workspace);
				});
	
				workspacesContainer.hide();
				sidebarSection.append(workspacesContainer);
	
				title.find('.toggle-icon').on('click', () => {
					workspacesContainer.slideToggle();
				});
			} else if (category === "Public") {
				const subPagesContainer = $('<div>').addClass('sub-pages-container');
	
				const publicPages = this.sidebar_pages.pages.filter(page => page.public);
	
				publicPages.forEach(item => {
					const subPage = this.createSidebarItem(item);
					subPagesContainer.append(subPage);
				});
	
				subPagesContainer.hide();
				sidebarSection.append(subPagesContainer);
	
				title.find('.toggle-icon').on('click', () => {
					subPagesContainer.slideToggle();
				});
			} else if (category === "Screens") {
				const subPagesContainer = $('<div>').addClass('sub-pages-container');
	
				this.screens_links.forEach(item => {
					const subPage = this.createSidebarItem(item);
					subPagesContainer.append(subPage);
				});
	
				subPagesContainer.hide();
				sidebarSection.append(subPagesContainer);
	
				title.find('.toggle-icon').on('click', () => {
					subPagesContainer.slideToggle();
				});
			}
	
			categoriesContainer.append(sidebarSection);
		});
	
		this.sidebar.append(categoriesContainer);
	}
}